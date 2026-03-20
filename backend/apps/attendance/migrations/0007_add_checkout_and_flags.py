"""Add check-out time to session entries and flags to attendance records."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0006_alter_attendancerecord_unique_together"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancesessionentry",
            name="check_out_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="left_early",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="no_check_out",
            field=models.BooleanField(default=False),
        ),
    ]
