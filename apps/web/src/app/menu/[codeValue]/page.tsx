import { fetchMenu } from "@/lib/api";
import { MenuView } from "./MenuView";

interface Props {
  params: Promise<{ codeValue: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { codeValue } = await params;
  try {
    const data = await fetchMenu(codeValue);
    return {
      title: `${data.restaurant.displayName} — Menu`,
      description: data.restaurant.description ?? "Browse our menu",
    };
  } catch {
    return { title: "Menu" };
  }
}

export default async function MenuPage({ params }: Props) {
  const { codeValue } = await params;

  let data;
  try {
    data = await fetchMenu(codeValue);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">
            {msg === "INVALID_CODE" ? "QR code not found" : "Something went wrong"}
          </h1>
          <p className="text-zinc-400 text-sm">
            {msg === "INVALID_CODE"
              ? "This QR code is invalid or has expired. Please ask for a new one."
              : "Could not load the menu. Please try again."}
          </p>
        </div>
      </main>
    );
  }

  return <MenuView data={data} codeValue={codeValue} />;
}
