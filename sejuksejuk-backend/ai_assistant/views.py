import json
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as s

from accounts.permissions import IsManagerOrAdmin
from audit.utils import record_action

from .models import Conversation, Message
from .runner import run_query


class QuerySerializer(drf_serializers.Serializer):
    question = drf_serializers.CharField(min_length=3, max_length=500)
    conversation_id = drf_serializers.IntegerField(required=False, allow_null=True)


class MessageSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "created_at"]


_AI_RESPONSE = inline_serializer("AIQueryResponse", fields={
    "conversation_id": s.IntegerField(),
    "answer": s.CharField(),
    "sources": s.ListField(),
})


class AIQueryView(APIView):
    permission_classes = [IsManagerOrAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_query"

    @extend_schema(request=QuerySerializer, responses={200: _AI_RESPONSE})
    def post(self, request):
        ser = QuerySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        question = ser.validated_data["question"]
        conv_id = ser.validated_data.get("conversation_id")

        # Resolve or create conversation
        if conv_id:
            try:
                conversation = Conversation.objects.get(pk=conv_id, user=request.user)
            except Conversation.DoesNotExist:
                return Response({"detail": "Conversation not found."}, status=404)
        else:
            conversation = Conversation.objects.create(user=request.user)

        # Build history from stored messages (last 10 turns to keep context bounded)
        history = list(
            conversation.messages.order_by("-created_at")
            .values("role", "content")[:10]
        )[::-1]

        result = run_query(question, conversation_id=conversation.pk)

        Message.objects.create(conversation=conversation, role="user", content=question)
        Message.objects.create(
            conversation=conversation,
            role="assistant",
            content=result["answer"],
            tool_calls_json=json.dumps(result["tool_calls"]),
        )

        record_action(request.user, "ai_query", payload={"question": question})

        return Response({
            "conversation_id": conversation.pk,
            "answer": result["answer"],
            "sources": result["tool_calls"],
        })


class ConversationDetailView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(responses={200: inline_serializer("ConversationDetail", fields={
        "id": s.IntegerField(), "created_at": s.DateTimeField(),
        "messages": MessageSerializer(many=True),
    })})
    def get(self, request, pk):
        try:
            conversation = Conversation.objects.get(pk=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        messages = conversation.messages.all()
        return Response({
            "id": conversation.pk,
            "created_at": conversation.created_at,
            "messages": MessageSerializer(messages, many=True).data,
        })
