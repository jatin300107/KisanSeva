import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from backend.auth import services


class AuthServicesTests(unittest.TestCase):
    def test_extracts_role_from_user_metadata(self):
        user = SimpleNamespace(user_metadata={"role": "vet"})
        self.assertEqual(services.get_user_role(user), "vet")

    def test_falls_back_to_users_table_for_role(self):
        user = SimpleNamespace(id="user-123", user_metadata={})
        fake_table = MagicMock()
        fake_table.select.return_value.eq.return_value.single.return_value.execute.return_value = SimpleNamespace(
            data=[{"role": "agrologist"}]
        )

        with patch.object(services, "supabase", MagicMock(table=MagicMock(return_value=fake_table))):
            self.assertEqual(services.get_user_role(user), "agrologist")


if __name__ == "__main__":
    unittest.main()
