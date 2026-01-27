export default function AppSettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">App Settings</h1>
      <div className="bg-card border rounded-lg p-6">
        <p className="text-muted-foreground">Configure Scope application preferences.</p>
        <div className="mt-8 text-sm text-yellow-500 bg-yellow-500/10 p-4 rounded-md border border-yellow-500/20">
            Coming soon: Dark mode toggles, ES connection settings, and more.
        </div>
      </div>
    </div>
  );
}
