from attendance.models.shift import Shift

class ShiftService:
    @staticmethod
    def list_shifts():
        return Shift.objects.all().order_by("start_time")

    @staticmethod
    def create_shift(data):
        return Shift.objects.create(**data)

    @staticmethod
    def update_shift(shift, data):
        for field, value in data.items():
            setattr(shift, field, value)
        shift.save()
        return shift

    @staticmethod
    def delete_shift(shift):
        shift.delete()