from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import User
from .serializers import UserSerializer
from .permissions import IsManagerOrAdmin


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UsersListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(
        parameters=[OpenApiParameter("role", str, OpenApiParameter.QUERY, required=False)],
        responses=UserSerializer(many=True),
    )
    def get(self, request):
        qs = User.objects.all()
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return Response(UserSerializer(qs, many=True).data)
