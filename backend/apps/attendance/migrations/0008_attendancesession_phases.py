"""Add phase tracking fields to attendance sessions."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0007_add_checkout_and_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancesession",
            name="check_in_closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="check_out_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="check_out_closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="phase",
            field=models.CharField(
                choices=[
                    ("CHECK_IN", "Check In"),
                    ("SLEEP", "Sleep"),
                    ("CHECK_OUT", "Check Out"),
                    ("CLOSED", "Closed"),
                ],
                default="CHECK_IN",
                max_length=20,
            ),
        ),
    ]
