@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: Booking Ledger — CancelBookingDialog + WarRoom uses bookings table (booked_at accounting)"
git push
echo Done!
pause
