from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0002_remove_employee_company_and_more'),
    ]

    # This migration is now a no-op because the indexes were already removed
    operations = []
