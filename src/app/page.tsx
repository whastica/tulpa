export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Tulpa</h1>
        <p className="text-lg text-muted-foreground max-w-md">Fondo de Ahorro y Crédito Comunal</p>
        <p className="text-sm text-muted-foreground">
          Plataforma digital para la gestión de fondos de ahorro comunal y créditos internos entre
          socios.
        </p>
      </main>
    </div>
  );
}
