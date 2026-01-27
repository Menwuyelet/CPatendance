"""Module backend/apps/accounts/permissions/utils.py

Auto-generated module docstring.
"""

def user_has_role(user, role_name: str) -> bool:
    """Return True when `user` belongs to the given role.

    Parameters:
    - `user`: User instance with a `roles` relationship.
    - `role_name` (str): role name to check.
    """
    return user.roles.filter(name=role_name).exists()