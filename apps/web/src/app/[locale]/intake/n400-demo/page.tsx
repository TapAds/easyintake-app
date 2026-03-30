import { AppChrome } from "@/components/AppChrome";
import { N400WebformDemoClient } from "@/components/intake/N400WebformDemoClient";

export default function N400IntakeDemoPage() {
  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4">
        <N400WebformDemoClient />
      </main>
    </AppChrome>
  );
}
