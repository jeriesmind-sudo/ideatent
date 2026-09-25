"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Copy, Lightbulb, Menu, Sparkles, Target, Users, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const previewIdeas = [
  ["MON", "Instagram", "Carousel", "Educational", "The three details that make a small brand feel established", "Small brand does not have to look small.", "A practical, saveable lesson builds trust while showing your eye for thoughtful brand decisions.", "Use one clean detail per slide: consistent type, confident spacing, and a recognisable colour cue.", "A polished brand is rarely about adding more. Start with three details: use one clear type system, give every element room to breathe, and repeat a recognisable colour cue. Small, consistent decisions make the whole business feel considered—and much easier to trust.", "Save this for your next brand refresh", "preview-0", "evergreen", "", ""],
  ["TUE", "LinkedIn", "Text post", "Authority", "A founder note on choosing clarity over constant content", "We stopped asking, ‘What should we post?’", "A transparent point of view positions the business as experienced without turning the post into a pitch.", "Open with the lesson, share one brief example, then close with the principle your team now follows.", "We used to begin content planning with a blank calendar. Now we begin with one useful question: what does our audience need to understand this week? That shift gave us fewer filler posts, stronger ideas, and a voice people can recognise. Clarity has done more for our content than constant output ever did.", "What principle guides your content?", "preview-1", "evergreen", "", ""],
  ["WED", "Instagram", "Reel", "Trend-based", "Turn one ordinary workday into a seven-second process reveal", "What clients see / what actually happens behind it", "Fast process reveals match current short-form viewing habits while keeping the idea specific to your work.", "Cut between the polished result and three honest behind-the-scenes moments.", "The finished work may look effortless, but every detail comes from a decision. Here is a quick look at the brief, the option we ruled out, and the small adjustment that brought the final direction together. The process is where good work earns its clarity.", "Send this to someone who loves the process", "preview-2", "platform", "Short-form process reveals", ""],
  ["THU", "Instagram", "Single image", "Community", "Invite your audience to choose between two directions", "Which way would you take this?", "A real choice gives followers a meaningful reason to comment and helps you learn their taste.", "Present two equally polished options side by side and label them simply A and B.", "Two strong directions, two very different impressions. Option A feels calm and established; option B feels energetic and expressive. There is no wrong answer—the better choice depends on what the brand needs people to feel first.", "Comment A or B—and tell us why", "preview-3", "evergreen", "", ""],
  ["FRI", "LinkedIn", "Document post", "Promotional", "Show the before, the decision, and the business result", "The visible change was only half the work.", "A compact case study connects craft to commercial value and earns the right to make a gentle offer.", "Use five pages: context, problem, key decision, finished work, and one result.", "The client did not only need a new look. They needed customers to understand the value of the business faster. We simplified the message, built the visual system around one clear promise, and gave the team an easier way to stay consistent. The result was a brand that looked stronger because it finally communicated with confidence.", "Planning a similar change? Let’s talk", "preview-4", "evergreen", "", ""],
];

const tones = ["Professional", "Friendly", "Playful", "Educational", "Premium", "Bold"];
const goals = ["Brand awareness", "Engagement", "Leads", "Sales", "Education", "Authority"];

type SavedProfile = {
  name?: string;
  industry?: string;
  city?: string;
  country?: string;
  description?: string;
  details?: {
    targetAudience?: string;
    brandTone?: string;
    contentGoals?: string;
    platforms?: string;
  } | null;
};

type StoredIdea = {
  id: string;
  day: string;
  platform: string;
  contentType: string;
  category: string;
  idea: string;
  hook: string;
  whyItWorks: string;
  creativeDirection: string;
  captionDirection: string;
  cta: string;
  trendType?: "global" | "industry" | "platform" | "seasonal" | "evergreen";
  trendTitle?: string | null;
  trendSourceTitle?: string | null;
  trendSourceUrl?: string | null;
};

type StoredPlan = {
  id: string;
  weekStart: string;
  status: "generating" | "ready" | "failed";
  ideas: StoredIdea[];
};

export function IdeaTentApp() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState(1);
  const [expanded, setExpanded] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [copiedIdea, setCopiedIdea] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<number | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState("");
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");
  const nav = [["Home", "home"], ["Previous plans", "plans"], ["Business profile", "profile"], ["Admin", "admin"]];
  const titles = ["Tell us about your business", "Who are you trying to reach?", "How should your brand sound?", "What should your content achieve?", "Where do you post?"];
  const activePlan = plans[0];
  const displayIdeas = activePlan?.ideas.length
    ? activePlan.ideas.map((idea) => [idea.day, idea.platform, idea.contentType, idea.category, idea.idea, idea.hook, idea.whyItWorks, idea.creativeDirection, idea.captionDirection, idea.cta, idea.id, idea.trendType ?? "evergreen", idea.trendTitle ?? "", idea.trendSourceTitle ?? "", idea.trendSourceUrl ?? ""])
    : previewIdeas;
  const canContinue = step === 1
    ? [name, industry, location, description].every((value) => value.trim())
    : step === 2
      ? Boolean(audience.trim())
      : step === 3
        ? selectedTones.length > 0
        : step === 4
          ? selectedGoals.length > 0
          : Boolean(platform);

  const toggle = (value: string, list: string[], setter: (value: string[]) => void) => setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then(async (response): Promise<{ profile?: SavedProfile | null } | null> => response.ok ? response.json() : null)
      .then((result) => {
        const profile = result?.profile;
        if (!active || !profile) return;
        setHasProfile(true);
        setName(profile.name ?? "");
        setIndustry(profile.industry ?? "");
        setLocation([profile.city, profile.country].filter(Boolean).join(", "));
        setDescription(profile.description ?? "");
        setAudience(profile.details?.targetAudience ?? "");
        setSelectedTones(parseList(profile.details?.brandTone, []));
        setSelectedGoals(parseList(profile.details?.contentGoals, []));
        const channels = parseList(profile.details?.platforms, []);
        setPlatform(channels.join(" + "));
      })
      .catch(() => undefined);
    loadPlans();
    return () => { active = false; };
  }, []);

  async function loadPlans() {
    try {
      const response = await fetch("/api/plans");
      const result = response.ok ? await response.json() as { plans?: StoredPlan[] } : null;
      setPlans(result?.plans ?? []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoaded(true);
    }
  }

  async function generatePlan() {
    setGenerationStatus("Building your plan…");
    try {
      const response = await fetch("/api/plans", { method: "POST" });
      const result = await response.json() as { error?: string; generation?: "ai" | "starter" };
      if (!response.ok) throw new Error(result.error || "Plan generation failed");
      await loadPlans();
      setExpanded(0);
      setGenerationStatus(result.generation === "ai" ? "Your AI-generated plan is ready." : "Your starter plan is ready.");
    } catch (error) {
      setGenerationStatus(error instanceof Error ? error.message : "Could not generate your plan.");
    }
  }

  async function saveProfile() {
    setSaveStatus("Saving…");
    const locationParts = location.split(",").map((part) => part.trim()).filter(Boolean);
    const city = locationParts[0] || "Not specified";
    const country = locationParts.slice(1).join(", ") || "Not specified";
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, industry, city, country, description, targetAudience: audience,
          brandTone: selectedTones, contentGoals: selectedGoals,
          platforms: platform.split("+").map((value) => value.trim()), postsPerWeek: 5,
        }),
      });
      if (!response.ok) throw new Error("save failed");
      setHasProfile(true);
      setSaveStatus("Saved");
      setOpen(false);
      await loadPlans();
    } catch {
      setSaveStatus("Could not save—please sign in and try again.");
    }
  }

  async function sendFeedback(value: "yes" | "no") {
    if (!activePlan) {
      setFeedbackStatus("Generate your first plan before leaving feedback.");
      return;
    }
    setFeedback(value);
    setFeedbackStatus("Saving…");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weeklyPlanId: activePlan.id, useful: value === "yes" }),
      });
      if (!response.ok) throw new Error("feedback failed");
      setFeedbackStatus("Thanks—your answer was saved.");
    } catch {
      setFeedbackStatus("Your choice is visible here, but could not be saved yet.");
    }
  }

  async function copyDraft(index: number, idea: string[]) {
    try {
      await navigator.clipboard.writeText([idea[5], idea[8], idea[9]].filter(Boolean).join("\n\n"));
      setCopiedIdea(index);
      setCopyError(null);
    } catch {
      setCopiedIdea(null);
      setCopyError(index);
    }
  }

  async function reviseDraft(ideaId: string, preset: string) {
    if (ideaId.startsWith("preview-")) {
      setRevisionStatus((current) => ({ ...current, [ideaId]: "Generate a saved plan to use the copy editor." }));
      return;
    }
    setRevisionStatus((current) => ({ ...current, [ideaId]: "Rewriting…" }));
    try {
      const response = await fetch(`/api/ideas/${ideaId}/revise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Revision failed");
      await loadPlans();
      setRevisionStatus((current) => ({ ...current, [ideaId]: "Revised and saved" }));
    } catch (error) {
      setRevisionStatus((current) => ({ ...current, [ideaId]: error instanceof Error ? error.message : "Could not revise this post" }));
    }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#home" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Lightbulb className="size-4.5" /></span><b className="text-lg tracking-[-.03em]">IdeaTent</b></a>
        <nav className="hidden items-center gap-1 md:flex">{nav.map(([label, id], index) => <a key={id} href={`#${id}`} className={`rounded-lg px-3.5 py-2 text-sm font-medium ${index === 0 ? "bg-accent" : "text-muted-foreground hover:bg-accent"}`}>{label}</a>)}</nav>
        <div className="flex gap-2"><div className="hidden rounded-xl border bg-card px-3 py-2 sm:block"><b className="block text-xs">Demo account</b><span className="block text-[11px] text-muted-foreground">Private beta</span></div><Button variant="outline" size="icon" className="md:hidden" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</Button></div>
      </div>
      {menu && <nav className="grid border-t px-5 py-3 md:hidden">{nav.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">{label}</a>)}</nav>}
    </header>

    <div className="mx-auto max-w-7xl px-5 pb-24 pt-9 lg:px-8">
      <section id="home" className="scroll-mt-24">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><span className={`rounded-full border px-2.5 py-1 font-medium ${activePlan ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>● &nbsp;{activePlan ? "Ready" : "Preview"}</span><span>{activePlan ? `Week of ${formatPlanDate(activePlan.weekStart)}` : "Generate your first saved plan"}</span></div><h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Your ideas for this week</h1><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{activePlan ? `Five useful starting points for ${name}, shaped around your audience, voice, and goals.` : "This preview shows the format. Complete your profile, then generate a plan that is saved to your account."}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(true)}>Edit business profile</Button><Button className="h-11 rounded-xl" disabled={Boolean(activePlan) || generationStatus === "Building your plan…"} onClick={() => hasProfile ? generatePlan() : setOpen(true)}>{activePlan ? "Plan saved" : hasProfile ? "Generate my plan" : "Complete profile"}<Sparkles /></Button></div></div>
        {generationStatus && <p className="mb-5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">{generationStatus}</p>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-[1.5rem] border bg-card shadow-[0_16px_50px_rgba(45,35,80,.07)]"><div className="flex items-center gap-2 border-b px-6 py-4"><WandSparkles className="size-4 text-primary" /><b className="text-sm">{activePlan ? "Copywriter plan" : "Copywriter preview"}</b></div><div className="divide-y">{displayIdeas.map((idea, index) => { const active = expanded === index; return <article key={idea[4]} className={active ? "bg-accent/35" : "hover:bg-accent/20"}><button className="grid w-full grid-cols-[58px_1fr_auto] gap-3 px-4 py-5 text-left sm:grid-cols-[76px_1fr_auto] sm:px-6" onClick={() => setExpanded(index)}><div><b className="text-xs tracking-[.14em] text-primary">{idea[0]}</b><span className="mt-1 block text-xs text-muted-foreground">{idea[2]}</span></div><div><div className="mb-2 flex flex-wrap gap-1.5"><Badge>{idea[1]}</Badge><Badge outline>{idea[3]}</Badge>{idea[11] !== "evergreen" && <Badge outline>{idea[11]} trend</Badge>}</div><h2 className="font-semibold leading-6 sm:text-lg">{idea[4]}</h2>{!active && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">“{idea[5]}”</p>}</div><ChevronRight className={`mt-1 size-5 text-muted-foreground transition ${active ? "rotate-90" : ""}`} /></button>{active && <div className="grid gap-5 px-5 pb-6 pl-[75px] sm:grid-cols-2 sm:pl-[106px]"><Detail label="Hook" value={`“${idea[5]}”`} /><Detail label="Why this works" value={idea[6]} /><Detail label="Creative direction" value={idea[7]} /><Detail label="Suggested CTA" value={idea[9]} />{idea[12] && <TrendDetail type={idea[11]} title={idea[12]} sourceTitle={idea[13]} sourceUrl={idea[14]} />}<CopyDetail value={idea[8]} status={copyError === index ? "Copy failed" : copiedIdea === index ? "Copied" : "Copy draft"} revisionStatus={revisionStatus[idea[10]]} onCopy={() => copyDraft(index, idea)} onRevise={(preset) => reviseDraft(idea[10], preset)} /></div>}</article>})}</div></div>
          <aside className="space-y-4"><div className="rounded-[1.35rem] bg-primary p-6 text-primary-foreground shadow-[0_16px_45px_rgba(48,37,108,.2)]"><div className="mb-8 grid size-10 place-items-center rounded-xl bg-white/12"><Sparkles className="size-5" /></div><p className="text-sm text-white/65">Plan status</p><p className="mt-1 text-2xl font-semibold">{activePlan ? "Saved and ready" : "Preview only"}</p><p className="mt-4 text-sm leading-6 text-white/70">{activePlan ? "This plan is stored in your private library and ready for feedback." : "Generate a plan after saving your business profile."}</p></div><div className="rounded-[1.35rem] border bg-card p-5"><div className="mb-4 flex justify-between"><b className="text-sm">This week’s mix</b><Target className="size-4 text-primary" /></div><Mix label="Teach" value="2 ideas" colour="bg-[#6558d3]" /><Mix label="Connect" value="2 ideas" colour="bg-[#f0a644]" /><Mix label="Promote" value="1 idea" colour="bg-[#28a47a]" /></div><div className="rounded-[1.35rem] border bg-card p-5"><b>Was this week’s plan useful?</b><div className="mt-4 grid grid-cols-2 gap-2"><Button disabled={!activePlan} variant={feedback === "yes" ? "default" : "outline"} onClick={() => sendFeedback("yes")}>Yes</Button><Button disabled={!activePlan} variant={feedback === "no" ? "default" : "outline"} onClick={() => sendFeedback("no")}>Not really</Button></div>{feedbackStatus && <p className="mt-3 text-sm text-muted-foreground">{feedbackStatus}</p>}</div></aside>
        </div>
      </section>

      <Section id="plans" eyebrow="Your library" title="Previous plans"><div className="overflow-hidden rounded-[1.35rem] border bg-card">{plans.length ? plans.map((plan) => <button key={plan.id} className="flex w-full items-center justify-between border-b px-5 py-4 text-left last:border-0 hover:bg-accent"><span className="flex items-center gap-4"><span className="grid size-10 place-items-center rounded-xl bg-accent"><CalendarDays className="size-4" /></span><span><b className="block">Week of {formatPlanDate(plan.weekStart)}</b><span className="text-sm text-muted-foreground">{plan.ideas.length} ideas · {plan.status === "ready" ? "Plan ready" : plan.status}</span></span></span><ArrowRight className="size-4" /></button>) : <p className="px-5 py-8 text-sm text-muted-foreground">{plansLoaded ? "Your saved plans will appear here after you generate the first one." : "Loading your plans…"}</p>}</div></Section>
      <Section id="profile" eyebrow="Business profile" title="The context behind every idea"><div className="grid gap-3 sm:grid-cols-2"><Card icon={<Lightbulb />} label="Business" value={hasProfile ? `${name} · ${industry}` : "Not completed yet"} /><Card icon={<Users />} label="Audience" value={audience || "Not completed yet"} /><Card icon={<Sparkles />} label="Voice" value={selectedTones.join(", ") || "Not completed yet"} /><Card icon={<Target />} label="Goals" value={selectedGoals.join(", ") || "Not completed yet"} /></div><Button className="mt-5" onClick={() => setOpen(true)}>{hasProfile ? "Update profile" : "Complete profile"}</Button></Section>
      <Section id="admin" eyebrow="Account status" title="Your private beta workspace"><div className="grid gap-3 sm:grid-cols-3"><Card icon={<Users />} label="Business profile" value={name ? "Ready" : "Incomplete"} /><Card icon={<Check />} label="Saved plans" value={`${plans.length}`} /><Card icon={<Sparkles />} label="Latest generation" value={activePlan ? activePlan.status : "Not started"} /></div></Section>
    </div>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.5rem] p-0 sm:max-w-2xl" showCloseButton={false}><div className="border-b px-6 pb-5 pt-6 sm:px-8"><div className="mb-5 flex justify-between"><b className="text-sm text-primary">{step} of 5</b><button onClick={() => setOpen(false)} aria-label="Close"><X className="size-4" /></button></div><Progress value={step * 20} /><DialogHeader className="mt-7"><DialogTitle className="text-2xl">{titles[step - 1]}</DialogTitle><DialogDescription>A little context now makes every weekly plan more specific.</DialogDescription></DialogHeader></div><div className="min-h-[300px] px-6 py-6 sm:px-8">{step === 1 && <div className="grid gap-5"><Field label="Business name"><Input value={name} placeholder="e.g. Cedar & Finch" onChange={(e) => setName(e.target.value)} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Industry"><Input value={industry} placeholder="e.g. Brand and design studio" onChange={(e) => setIndustry(e.target.value)} /></Field><Field label="City, country"><Input value={location} placeholder="e.g. Lagos, Nigeria" onChange={(e) => setLocation(e.target.value)} /></Field></div><Field label="What does your business do?"><Textarea value={description} placeholder="Describe your offer and the value you create." onChange={(e) => setDescription(e.target.value)} rows={3} /></Field></div>}{step === 2 && <Field label="Describe your ideal customer"><Textarea value={audience} placeholder="Who are they, and what are they trying to achieve?" onChange={(e) => setAudience(e.target.value)} rows={6} /></Field>}{step === 3 && <Choices options={tones} selected={selectedTones} toggle={(value) => toggle(value, selectedTones, setSelectedTones)} />}{step === 4 && <Choices options={goals} selected={selectedGoals} toggle={(value) => toggle(value, selectedGoals, setSelectedGoals)} />}{step === 5 && <Field label="Primary channels"><Select value={platform} onValueChange={setPlatform}><SelectTrigger className="w-full"><SelectValue placeholder="Choose your primary channels" /></SelectTrigger><SelectContent><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem><SelectItem value="Instagram + LinkedIn">Instagram + LinkedIn</SelectItem></SelectContent></Select></Field>}{saveStatus && <p className="mt-5 text-sm text-muted-foreground">{saveStatus}</p>}</div><div className="flex justify-between border-t px-6 py-5 sm:px-8"><Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button><Button disabled={saveStatus === "Saving…" || !canContinue} onClick={() => step === 5 ? saveProfile() : setStep(step + 1)}>{step === 5 ? "Save profile" : "Continue"}<ArrowRight /></Button></div></DialogContent></Dialog>
  </main>;
}

function Badge({ children, outline = false }: { children: React.ReactNode; outline?: boolean }) { return <span className={`rounded-full px-2 py-0.5 text-[11px] ${outline ? "border text-muted-foreground" : "bg-secondary font-semibold text-secondary-foreground"}`}>{children}</span>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="mb-1 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="text-sm leading-6">{value}</p></div>; }
function CopyDetail({ value, status, revisionStatus, onCopy, onRevise }: { value: string; status: string; revisionStatus?: string; onCopy: () => void; onRevise: (preset: string) => void }) { const busy = revisionStatus === "Rewriting…"; return <div className="rounded-xl border bg-background p-4 sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Ready-to-post copy</p><Button type="button" size="sm" variant="outline" onClick={onCopy}>{status === "Copied" ? <Check /> : <Copy />}{status}</Button></div><p className="whitespace-pre-wrap text-sm leading-6">{value}</p><div className="mt-4 border-t pt-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">Ask your copywriter to revise it</p><div className="flex flex-wrap gap-2">{[["punchier", "Make punchier"], ["shorter", "Make shorter"], ["friendlier", "More friendly"], ["persuasive", "More persuasive"], ["rewrite", "Fresh angle"]].map(([preset, label]) => <Button key={preset} type="button" size="sm" variant="outline" disabled={busy} onClick={() => onRevise(preset)}>{label}</Button>)}</div>{revisionStatus && <p className="mt-2 text-xs text-muted-foreground">{revisionStatus}</p>}</div></div>; }
function TrendDetail({ type, title, sourceTitle, sourceUrl }: { type: string; title: string; sourceTitle: string; sourceUrl: string }) { return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">{type} trend</p><p className="mt-1 text-sm font-semibold">{title}</p>{sourceUrl && <a className="mt-2 inline-block text-xs text-primary underline underline-offset-4" href={sourceUrl} target="_blank" rel="noreferrer">Source: {sourceTitle || "View research"}</a>}</div>; }
function Mix({ label, value, colour }: { label: string; value: string; colour: string }) { return <div className="mb-3 flex justify-between text-sm"><span className="flex items-center gap-2"><i className={`size-2 rounded-full ${colour}`} />{label}</span><span className="text-muted-foreground">{value}</span></div>; }
function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) { return <section id={id} className="scroll-mt-24 pt-20"><p className="text-sm font-semibold text-primary">{eyebrow}</p><h2 className="mb-6 mt-1 text-2xl font-semibold tracking-[-.035em]">{title}</h2>{children}</section>; }
function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-[1.25rem] border bg-card p-5"><div className="mb-4 grid size-10 place-items-center rounded-xl bg-accent text-primary [&_svg]:size-4">{icon}</div><b className="text-sm">{label}</b><p className="mt-1 text-sm leading-6 text-muted-foreground">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>; }
function Choices({ options, selected, toggle }: { options: string[]; selected: string[]; toggle: (value: string) => void }) { return <div className="grid gap-3 sm:grid-cols-2">{options.map((option) => <label key={option} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected.includes(option) ? "border-primary bg-primary/5" : ""}`}><Checkbox checked={selected.includes(option)} onCheckedChange={() => toggle(option)} />{option}</label>)}</div>; }
function parseList(value: unknown, fallback: string[]) { try { const parsed = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback; } catch { return fallback; } }
function formatPlanDate(value: string) { const date = new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date); }
