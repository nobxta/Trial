// Separate layout for 404 page - bypasses admin layout
export default function NotFoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

