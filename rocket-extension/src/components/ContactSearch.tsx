import { useState } from "react";
import { Search, ExternalLink, Users } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError, type Contact, openContactInCrm } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

export function ContactSearch({
  location,
  crmDomain,
  toast,
}: {
  location: SavedLocation;
  crmDomain: string | null;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const list = await crm.searchContacts(location.id, query.trim(), 25);
      setResults(list);
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const baseDomain = crmDomain ?? "https://app.rocketclients.com";

  const openContact = (contact: Contact) => {
    const url = openContactInCrm(baseDomain, location.id, contact.id);
    chrome.tabs.create({ url });
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Contact Search</h3>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, email, or phone…"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
        />
      </form>

      <div className="max-h-[260px] overflow-y-auto space-y-1.5">
        {loading && (
          <div className="space-y-1.5">
            <div className="h-12 bg-[#0d1117] border border-[#30363d] rounded-lg animate-pulse" />
            <div className="h-12 bg-[#0d1117] border border-[#30363d] rounded-lg animate-pulse" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-xs text-[#8b949e] py-3 text-center">
            No contacts found.
          </div>
        )}

        {!loading && !searched && (
          <div className="text-xs text-[#8b949e] py-3 text-center">
            Enter a query and press Enter.
          </div>
        )}

        {!loading &&
          results.map((contact) => {
            const name =
              contact.contactName ||
              [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
              "Unnamed contact";
            return (
              <button
                key={contact.id}
                onClick={() => openContact(contact)}
                className="w-full text-left bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 flex items-center gap-2 hover:border-[#484f58] hover:bg-[#1c2128] transition-all duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#e6edf3] truncate">
                    {name}
                  </div>
                  <div className="text-[11px] text-[#8b949e] truncate">
                    {contact.email || contact.phone || contact.id}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
              </button>
            );
          })}
      </div>
    </div>
  );
}
