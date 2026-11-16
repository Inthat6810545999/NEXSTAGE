import { UserActivityLog } from './models.js';

export async function recordBookingActivity(
  booking,
  actionType,
  { ipAddress = null, timestamp = new Date() } = {}
) {
  const dedupeKey = `booking-${booking.id}-${actionType}`;

  await UserActivityLog.updateOne(
    { dedupeKey },
    {
      $setOnInsert: {
        userId: booking.user_id,
        action_type: actionType,
        ip_address: ipAddress,
        metadata: {
          bookingId: booking.id,
          bookingCode: booking.booking_code,
          totalAmount: Number(booking.total_amount)
        },
        timestamp,
        dedupeKey
      }
    },
    {
      upsert: true,
      runValidators: true
    }
  );
}