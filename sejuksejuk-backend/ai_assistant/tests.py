from datetime import date
from unittest.mock import patch
from django.test import TestCase, TransactionTestCase

from langchain_core.messages import AIMessage
from rest_framework.test import APIClient

from kpi.tests import ReportingFixtures
from . import tools, runner


class ScopedAiToolTests(ReportingFixtures, TestCase):
    def invoke(self, tool, args, user=None):
        config = {"configurable": {"user_id": user.pk}} if user else {}
        with patch("ai_assistant.tools._period_range", return_value=(date(2026, 10, 1), date(2026, 10, 1))), patch(
            "kpi.aggregations._date_range", return_value=(date(2026, 10, 1), date(2026, 10, 1))
        ):
            return tool.invoke(args, config=config)

    def test_manager_cannot_get_another_branch_order(self):
        result = self.invoke(tools.get_order_summary, {"order_no": self.other_order.order_no}, self.manager)
        self.assertIn("error", result)
        result = self.invoke(tools.get_order_summary, {"order_no": self.order.order_no}, self.manager)
        self.assertEqual(result["order_no"], self.order.order_no)

    def test_every_aggregate_and_list_tool_is_scoped(self):
        for user, count, amount in ((self.manager, 1, 100.0), (self.admin, 2, 1000.0)):
            with self.subTest(user=user.username):
                result = self.invoke(tools.count_jobs, {"period": "month"}, user)
                self.assertEqual(result["count"], count)
                ranked = self.invoke(tools.top_technicians, {"period": "month"}, user)["top"]
                self.assertEqual(len(ranked), count)
                self.assertEqual(sum(row["total_amount"] for row in ranked), amount)
                workload = self.invoke(tools.technician_workload, {"period": "month"}, user)["technicians"]
                self.assertEqual(len(workload), count)
                self.assertEqual(sum(row["total_amount"] for row in workload), amount)
        jobs = self.invoke(tools.list_jobs_by_technician, {"technician_name": "local-tech"}, self.manager)
        self.assertEqual(jobs["count"], 1)
        self.assertEqual(jobs["jobs"][0]["completed_at"], self.start)
        self.assertIn("error", self.invoke(
            tools.list_jobs_by_technician, {"technician_name": "other-tech"}, self.manager
        ))

    def test_shared_technician_does_not_expose_other_branch_jobs(self):
        self.other_order.assigned_technician = self.technician
        self.other_order.save()
        jobs = self.invoke(tools.list_jobs_by_technician, {"technician_name": "local-tech"}, self.manager)
        self.assertEqual([job["order_no"] for job in jobs["jobs"]], [self.order.order_no])

    def test_admin_can_get_another_branch_order(self):
        result = self.invoke(tools.get_order_summary, {"order_no": self.other_order.order_no}, self.admin)
        self.assertEqual(result["order_no"], self.other_order.order_no)

    def test_missing_identity_technicians_and_branchless_managers_cannot_query_data(self):
        self.manager.branch = None
        self.manager.save()
        for user in (None, self.technician, self.manager):
            with self.subTest(user=user):
                self.assertEqual(self.invoke(tools.count_jobs, {"period": "month"}, user)["count"], 0)
                self.assertIn("error", self.invoke(
                    tools.get_order_summary, {"order_no": self.order.order_no}, user
                ))

    def test_model_cannot_supply_authorization_arguments(self):
        for tool in tools.TOOLS:
            schema = tool.tool_call_schema.model_json_schema()
            self.assertNotIn("config", schema.get("properties", {}))
            self.assertNotIn("user_id", schema.get("properties", {}))
        result = self.invoke(
            tools.get_order_summary,
            {"order_no": self.other_order.order_no, "user_id": self.admin.pk},
            self.manager,
        )
        self.assertIn("error", result)

    def test_completed_counts_and_rankings_ignore_review_date(self):
        for status in ("reviewed", "closed"):
            self.order.status = status
            self.order.save()
            self.assertEqual(self.invoke(tools.count_jobs, {"period": "month"}, self.manager)["count"], 1)
            self.assertEqual(self.invoke(tools.count_jobs, {"period": "month", "status": status}, self.manager)["count"], 1)
            self.assertEqual(self.invoke(tools.top_technicians, {"period": "month"}, self.manager)["top"][0]["total_amount"], 100.0)

    def test_query_endpoint_passes_authenticated_user_to_runner(self):
        client = APIClient()
        client.force_authenticate(self.manager)
        with patch("ai_assistant.views.run_query", return_value={"answer": "OK", "tool_calls": []}) as run:
            response = client.post("/api/ai/query/", {"question": "How many jobs?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(run.call_args.kwargs["user"], self.manager)

class AiGraphAuthorizationTests(ReportingFixtures, TransactionTestCase):
    def setUp(self):
        # LangGraph runs tools on worker connections, which need committed fixtures.
        self.setUpTestData()

    def test_runner_injects_identity_into_real_tool_execution(self):
        # Exercise the compiled graph and its ToolNode, without an external LLM.
        from ai_assistant.providers import MockChatModel
        from langgraph.prebuilt import create_react_agent

        class ToolCallingModel(MockChatModel):
            def _generate(self, messages, **kwargs):
                from langchain_core.messages import ToolMessage
                from langchain_core.outputs import ChatGeneration, ChatResult

                if isinstance(messages[-1], ToolMessage):
                    message = AIMessage(content=messages[-1].content)
                else:
                    message = AIMessage(content="", tool_calls=[{
                        "name": "get_order_summary", "args": {"order_no": self_order_no}, "id": "lookup"
                    }])
                return ChatResult(generations=[ChatGeneration(message=message)])

        self_order_no = self.other_order.order_no
        graph = create_react_agent(ToolCallingModel(), tools=tools.TOOLS)
        with patch.object(runner, "agent", graph):
            denied = runner.run_query("Find order", 1, user=self.manager)
            allowed = runner.run_query("Find order", 2, user=self.admin)
        self.assertIn("not found", denied["answer"])
        self.assertNotIn("address", denied["answer"])
        self.assertIn("address", allowed["answer"])
