type BookingConfirmationEmailProps = {
  bookingReference: string;
  checkIn: string;
  checkOut: string;
  total: string;
};

export function BookingConfirmationEmail(props: BookingConfirmationEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#1f2937', lineHeight: 1.6 }}>
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>Your booking is confirmed</h1>
        <p>Reference: <strong>{props.bookingReference}</strong></p>
        <p>Check-in: <strong>{props.checkIn}</strong></p>
        <p>Check-out: <strong>{props.checkOut}</strong></p>
        <p>Total charged: <strong>{props.total}</strong></p>
      </body>
    </html>
  );
}
