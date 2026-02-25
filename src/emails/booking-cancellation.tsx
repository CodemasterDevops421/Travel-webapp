type BookingCancellationEmailProps = {
  bookingReference: string;
  checkIn: string;
  checkOut: string;
  total: string;
  outcome: string;
  invoiceStatus: string;
};

export function BookingCancellationEmail(props: BookingCancellationEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#1f2937', lineHeight: 1.6 }}>
        <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>{props.outcome}</h1>
        <p>Reference: <strong>{props.bookingReference}</strong></p>
        <p>Check-in: <strong>{props.checkIn}</strong></p>
        <p>Check-out: <strong>{props.checkOut}</strong></p>
        <p>Total: <strong>{props.total}</strong></p>
        <p>Invoice status: <strong>{props.invoiceStatus}</strong></p>
      </body>
    </html>
  );
}
