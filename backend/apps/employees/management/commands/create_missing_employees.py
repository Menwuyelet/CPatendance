"""Management command to create employee profiles for users who don't have one."""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.employees.models import Employee
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Create employee profiles for users who do not have one.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all users without employee profiles
        users_without_employee = User.objects.filter(employee__isnull=True)
        
        self.stdout.write(f'Found {users_without_employee.count()} users without employee profiles.')
        
        if dry_run:
            self.stdout.write('DRY RUN - No changes will be made:')
            for user in users_without_employee:
                self.stdout.write(f'  Would create employee for: {user.email}')
            return
        
        created_count = 0
        errors = []
        
        for user in users_without_employee:
            try:
                # Generate employee code from email
                email_base = user.email.split('@')[0]
                # Create a slug-like employee code
                employee_code = slugify(email_base).upper()[:20]
                
                # Ensure unique employee code
                original_code = employee_code
                counter = 1
                while Employee.objects.filter(employee_code=employee_code).exists():
                    employee_code = f"{original_code[:15]}{counter:03d}"
                    counter += 1
                
                # Create full name from email (first part of email, title case)
                full_name = ' '.join(word.capitalize() for word in email_base.replace('.', ' ').replace('_', ' ').split())
                
                employee = Employee.objects.create(
                    user=user,
                    employee_code=employee_code,
                    full_name=full_name,
                    department=None,  # No department by default
                )
                
