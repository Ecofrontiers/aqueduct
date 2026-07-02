import { useState } from "react";
import Header from "../Header";
import Footer from "../Footer";
import {
  TreeStructure,
  Users,
  Lightning,
  ArrowRight,
  CheckCircle,
  Globe,
  MapPin,
  LinkSimple,
  Robot,
  Plus,
  X,
  Info,
} from "@phosphor-icons/react";

type EntityType = "asset" | "actor" | "action";
type ActorSubtype = "organization" | "agent";

const ENTITY_OPTIONS: { key: EntityType; label: string; icon: typeof TreeStructure; description: string }[] = [
  { key: "asset", label: "Asset", icon: TreeStructure, description: "Carbon credits, biodiversity tokens, renewable energy certificates, or other tokenized green assets." },
  { key: "actor", label: "Actor", icon: Users, description: "Organizations, DAOs, protocols, or AI agents working in the green economy." },
  { key: "action", label: "Action", icon: Lightning, description: "Onchain activities — retirements, conservation actions, or verified impact." },
];

const ASSET_TYPES = [
  "Commodities",
  "Impact RWAs",
  "Clean Energy",
  "Ecotokens",
  "Crypto-native",
  "Currency",
];

const ACTION_PROTOCOLS = [
  "Ecocerts",
  "Atlantis",
  "Silvi",
  "Hedera Guardian",
];

const ALL_SDGS = [
  "1 — No Poverty",
  "2 — Zero Hunger",
  "3 — Good Health and Well-being",
  "4 — Quality Education",
  "5 — Gender Equality",
  "6 — Clean Water and Sanitation",
  "7 — Affordable and Clean Energy",
  "8 — Decent Work and Economic Growth",
  "9 — Industry, Innovation and Infrastructure",
  "10 — Reduced Inequalities",
  "11 — Sustainable Cities and Communities",
  "12 — Responsible Consumption and Production",
  "13 — Climate Action",
  "14 — Life Below Water",
  "15 — Life on Land",
  "16 — Peace, Justice and Strong Institutions",
  "17 — Partnerships for the Goals",
];

const FORMSPREE_URL = "https://formspree.io/f/mqegqdzk";

const inputClass = "w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 bg-white";
const labelClass = "block text-xs font-semibold text-gray-700 mb-1";

export default function ListProject() {
  const [entityType, setEntityType] = useState<EntityType>("asset");
  const [actorSubtype, setActorSubtype] = useState<ActorSubtype>("organization");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSdgs, setSelectedSdgs] = useState<Set<string>>(new Set());
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);

  const toggleSdg = (sdg: string) => {
    setSelectedSdgs((prev) => {
      const next = new Set(prev);
      if (next.has(sdg)) next.delete(sdg);
      else next.add(sdg);
      return next;
    });
  };

  const addSocialLink = () => setSocialLinks((prev) => [...prev, { platform: "", url: "" }]);
  const removeSocialLink = (i: number) => setSocialLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateSocialLink = (i: number, field: "platform" | "url", value: string) => {
    setSocialLinks((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    data.append("entity_type", entityType);
    data.append("_cc", "louise@ecofrontiers.xyz");
    if (entityType === "actor") data.append("actor_subtype", actorSubtype);
    if (selectedSdgs.size > 0) data.append("sdgs", Array.from(selectedSdgs).join(", "));
    if (socialLinks.length > 0) {
      data.append("social_links", socialLinks.filter(s => s.url).map(s => `${s.platform}: ${s.url}`).join("\n"));
    }

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-[60px] lg:pt-[36px]">
          <div className="max-w-[640px] mx-auto px-4 py-20 text-center">
            <CheckCircle size={48} weight="duotone" className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Submission received</h1>
            <p className="text-sm text-gray-500 mb-6">
              We'll review your project and get back to you shortly.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Back to Map <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-[60px] lg:pt-[36px]">
        <div className="max-w-[640px] mx-auto px-4 py-12 md:py-16 pb-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
            List Your Project
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            Add to Regen Atlas
          </h1>
          <p className="text-sm text-gray-500 mb-10 leading-relaxed">
            Submit an asset, actor, or action to be listed on the map.
            All submissions are reviewed before publishing.
          </p>

          {/* Entity type selector */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            {ENTITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = entityType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setEntityType(opt.key)}
                  className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-all cursor-pointer ${
                    active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <Icon size={20} weight={active ? "fill" : "duotone"} />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mb-8">
            {ENTITY_OPTIONS.find((o) => o.key === entityType)?.description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── ASSET FORM ── */}
            {entityType === "asset" && (
              <>
                <div>
                  <label className={labelClass}>Asset Name *</label>
                  <input name="name" required className={inputClass} placeholder="e.g. Amazon Green Wall NFT Series 2" />
                </div>
                <div>
                  <label className={labelClass}>Description *</label>
                  <textarea name="description" required rows={3} className={inputClass + " resize-none"} placeholder="What is this asset? What impact does it represent?" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Asset Type *</label>
                    <select name="asset_type" required className={inputClass}>
                      <option value="">Select type</option>
                      {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Chain *</label>
                    <input name="chain" required className={inputClass} placeholder="e.g. Polygon, Celo, Base" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Issuer / Organization</label>
                  <input name="issuer" className={inputClass} placeholder="e.g. Glow, Toucan, Regen Network" />
                </div>
                <div>
                  <label className={labelClass}><LinkSimple size={11} className="inline mr-1" />Token / Contract Link</label>
                  <input name="token_link" type="url" className={inputClass} placeholder="Block explorer link to the token or contract" />
                </div>
                <div>
                  <label className={labelClass}><LinkSimple size={11} className="inline mr-1" />Market / DEX Link *</label>
                  <input name="market_link" type="url" required className={inputClass} placeholder="e.g. Uniswap pool, OpenSea collection, or exchange listing" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}><MapPin size={11} className="inline mr-1" />Location</label>
                    <input name="location" className={inputClass} placeholder="Country or region" />
                  </div>
                  <div>
                    <label className={labelClass}>Coordinates</label>
                    <input name="coordinates" className={inputClass} placeholder="lat, lng (optional)" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Image URL</label>
                  <input name="image_url" type="url" className={inputClass} placeholder="URL of a photo or image representing this asset" />
                </div>
                <div>
                  <label className={labelClass}><Globe size={11} className="inline mr-1" />Website</label>
                  <input name="website" type="url" className={inputClass} placeholder="https://" />
                </div>
              </>
            )}

            {/* ── ACTOR FORM ── */}
            {entityType === "actor" && (
              <>
                {/* Actor subtype toggle */}
                <div>
                  <label className={labelClass}>Actor Type *</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setActorSubtype("organization")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded text-xs font-semibold transition-all cursor-pointer ${
                        actorSubtype === "organization" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      <Users size={14} /> Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => setActorSubtype("agent")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded text-xs font-semibold transition-all cursor-pointer ${
                        actorSubtype === "agent" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      <Robot size={14} /> Agent
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{actorSubtype === "organization" ? "Organization" : "Agent"} Name *</label>
                  <input name="name" required className={inputClass} placeholder={actorSubtype === "organization" ? "e.g. Greenpill Brasil" : "e.g. owockibot"} />
                </div>
                <div>
                  <label className={labelClass}>Description *</label>
                  <textarea name="description" required rows={3} className={inputClass + " resize-none"} placeholder={actorSubtype === "organization" ? "What does the organization do?" : "What does this agent do? What protocols does it use?"} />
                </div>
                {actorSubtype === "organization" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Organization Type</label>
                      <select name="org_type" className={inputClass}>
                        <option value="">Select type</option>
                        <option value="dao">DAO</option>
                        <option value="foundation">Foundation</option>
                        <option value="company">Company</option>
                        <option value="collective">Collective</option>
                        <option value="protocol">Protocol</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Year Established</label>
                      <input name="established" type="number" min="1990" max="2026" className={inputClass} placeholder="e.g. 2021" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      <MapPin size={11} className="inline mr-1" />
                      Location {actorSubtype === "organization" ? "*" : ""}
                    </label>
                    <input name="location" required={actorSubtype === "organization"} className={inputClass} placeholder="Country, city, or region" />
                  </div>
                  <div>
                    <label className={labelClass}>Chain(s)</label>
                    <input name="chains" className={inputClass} placeholder="e.g. Ethereum, Celo, Base" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Treasury / Onchain Presence *</label>
                  <input name="treasury_link" type="url" required className={inputClass} placeholder="Block explorer link to treasury, multisig, or agent address" />
                </div>
                <div>
                  <label className={labelClass}>Image URL</label>
                  <input name="image_url" type="url" className={inputClass} placeholder="URL of a logo or photo" />
                </div>
                <div>
                  <label className={labelClass}><Globe size={11} className="inline mr-1" />Website *</label>
                  <input name="website" type="url" required className={inputClass} placeholder="https://" />
                </div>

                {/* Social links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass + " mb-0"}>Social Links</label>
                    <button type="button" onClick={addSocialLink} className="flex items-center gap-1 text-[10px] font-semibold text-primary-400 hover:text-primary-500 cursor-pointer">
                      <Plus size={10} /> Add link
                    </button>
                  </div>
                  {socialLinks.length === 0 && (
                    <p className="text-xs text-gray-400">No social links added yet.</p>
                  )}
                  <div className="space-y-2">
                    {socialLinks.map((s, i) => (
                      <div key={i} className="flex gap-2">
                        <select
                          value={s.platform}
                          onChange={(e) => updateSocialLink(i, "platform", e.target.value)}
                          className="w-28 px-2 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-gray-400 bg-white"
                        >
                          <option value="">Platform</option>
                          <option value="x">X / Twitter</option>
                          <option value="telegram">Telegram</option>
                          <option value="discord">Discord</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="github">GitHub</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          value={s.url}
                          onChange={(e) => updateSocialLink(i, "url", e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-gray-400 bg-white"
                          placeholder="https://"
                        />
                        <button type="button" onClick={() => removeSocialLink(i)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── ACTION FORM ── */}
            {entityType === "action" && (
              <>
                <div>
                  <label className={labelClass}>Action Title *</label>
                  <input name="name" required className={inputClass} placeholder="e.g. Mangrove Restoration — Sindhudurg Coast" />
                </div>
                <div>
                  <label className={labelClass}>Description *</label>
                  <textarea name="description" required rows={3} className={inputClass + " resize-none"} placeholder="What action was taken? What impact was generated?" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Protocol *</label>
                    <input name="protocol" required list="protocol-options" className={inputClass} placeholder="Type or select a protocol" />
                    <datalist id="protocol-options">
                      {ACTION_PROTOCOLS.map((p) => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Chain *</label>
                    <input name="chain" required className={inputClass} placeholder="e.g. Polygon, Celo, Hedera" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Associated Actor / Organization</label>
                  <input name="actor" className={inputClass} placeholder="e.g. DOVU, Tolam Earth, Capturiant" />
                </div>
                <div>
                  <label className={labelClass}><LinkSimple size={11} className="inline mr-1" />Onchain or Verifiable Proof *</label>
                  <input name="proof_link" type="url" required className={inputClass} placeholder="Block explorer, IPFS, or verification link" />
                </div>
                <div>
                  <label className={labelClass}>Image URL</label>
                  <input name="image_url" type="url" className={inputClass} placeholder="URL of a photo representing this action" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}><MapPin size={11} className="inline mr-1" />Location *</label>
                    <input name="location" required className={inputClass} placeholder="Country or region" />
                  </div>
                  <div>
                    <label className={labelClass}>Coordinates</label>
                    <input name="coordinates" className={inputClass} placeholder="lat, lng (optional)" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <input name="start_date" type="date" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End Date</label>
                    <input name="end_date" type="date" className={inputClass} />
                  </div>
                </div>

                {/* SDG selector */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className={labelClass + " mb-0"}>Sustainable Development Goals</label>
                    <div className="relative group">
                      <Info size={13} className="text-gray-400 cursor-help" />
                      <div className="absolute left-0 bottom-full mb-1 w-64 bg-gray-900 text-white text-[10px] leading-relaxed p-3 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                        <p className="font-semibold mb-1">UN Sustainable Development Goals</p>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {ALL_SDGS.map((sdg) => (
                            <div key={sdg}>{sdg}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ALL_SDGS.map((sdg) => {
                      const code = sdg.split(" ")[0];
                      const active = selectedSdgs.has(sdg);
                      return (
                        <button
                          key={sdg}
                          type="button"
                          onClick={() => toggleSdg(sdg)}
                          title={sdg}
                          className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── Contact (all forms) ── */}
            <div className="border-t border-gray-100 pt-5 mt-6">
              <p className="text-xs font-semibold text-gray-700 mb-4">Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Your Name *</label>
                  <input name="contact_name" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input name="email" type="email" required className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Anything else?</label>
              <textarea name="notes" rows={2} className={inputClass + " resize-none"} placeholder="Additional context, links, documentation, or notes" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
              {!submitting && <ArrowRight size={14} />}
            </button>
          </form>
        </div>

        <div className="hidden lg:block w-full fixed left-0 bottom-0 z-50 h-[36px] bg-background">
          <Footer />
        </div>
      </div>
    </>
  );
}
