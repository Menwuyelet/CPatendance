def user_has_role(user, role_name: str) -> bool:
    return user.roles.filter(name=role_name).exists()