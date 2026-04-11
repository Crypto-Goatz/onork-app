export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#04070f",
        color: "#ffffff",
      }}
    >
      {children}
    </div>
  );
}
