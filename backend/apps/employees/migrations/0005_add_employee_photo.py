# Generated migration for adding photo field to Employee
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0004_remove_department_employees_d_company_c377c2_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='photo',
            field=models.ImageField(upload_to='employees/photos/', null=True, blank=True),
        ),
    ]
