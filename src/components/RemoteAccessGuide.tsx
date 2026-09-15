import React, { useState } from 'react';
import {
  Tv,
  Wifi,
  Globe,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Zap,
  HelpCircle,
  Smartphone,
  Radio,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface RemoteAccessGuideProps {
  port?: number;
}

export const RemoteAccessGuide: React.FC<RemoteAccessGuideProps> = ({ port = 3000 }) => {
  const [localIp, setLocalIp] = useState<string>('192.168.1.50');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'local' | 'ngrok' | 'chrome_tv'>('cloudflare');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const computedUrl = `http://${localIp.trim() || '192.168.1.X'}:${port}`;

  return (
    <div className="space-y-6">
      {/* Top Banner: Quick Summary */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-[#0b0f19] to-[#030712] p-6 shadow-2xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Tv className="h-3.5 w-3.5" />
              <span>Android TV & Remote Streaming Setup</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Outfit']">
              Stream from Phone / Termux to your Smart TV
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
              CineVault is engineered to stream local media smoothly across your home network. Use a secure tunnel to eliminate TV SSL warnings, or connect directly over local Wi-Fi port forwarding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono font-medium text-white">Port {port} (0.0.0.0)</span>
            </div>
          </div>
        </div>

        {/* Live TV URL Quick Generator */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Your Phone's Local Wi-Fi IP Address:
              </label>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-xs text-[#71717A] font-mono">http://</span>
                <input
                  type="text"
                  value={localIp}
                  onChange={(e) => setLocalIp(e.target.value)}
                  placeholder="e.g. 192.168.1.15"
                  className="rounded-lg border border-white/10 bg-[#11131A] px-3 py-1.5 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-[#71717A] font-mono">:{port}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(computedUrl, 'tv-url')}
                className="flex items-center space-x-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 active:scale-95 transition-all"
              >
                {copiedKey === 'tv-url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedKey === 'tv-url' ? 'Copied TV Link!' : 'Copy TV URL'}</span>
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#71717A]">
            Type this URL in your TV's browser. If your TV says "Site Not Secure" or shows a blank page, choose Cloudflare Tunnel below for an instant fix!
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/5 bg-[#0b0f19] p-1.5">
        <button
          onClick={() => setActiveTab('cloudflare')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'cloudflare'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Cloudflare Tunnel (Best for TV)</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
            Recommended
          </span>
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'local'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
          }`}
        >
          <Wifi className="h-4 w-4" />
          <span>Local Wi-Fi & Port Forwarding</span>
        </button>

        <button
          onClick={() => setActiveTab('ngrok')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'ngrok'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Ngrok Secure Proxy</span>
        </button>

        <button
          onClick={() => setActiveTab('chrome_tv')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'chrome_tv'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span>TV Chrome "Not Secure" Fixes</span>
        </button>
      </div>

      {/* Tab 1: Cloudflare Tunnel (Recommended) */}
      {activeTab === 'cloudflare' && (
        <div className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Cloudflare Tunnel (Zero Trust Quick Tunnel)
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                100% Free • No port forwarding • Real HTTPS certificate • Bypasses TV SSL blocks completely
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
            Smart TVs (especially Google Chrome on Android TV) strictly block non-HTTPS local IP connections with "Not Secure" warnings or blank pages. Cloudflare Tunnel gives your Termux server a secure <code>https://xxx.trycloudflare.com</code> URL with a valid SSL certificate that loads flawlessly on any Smart TV with no router changes!
          </p>

          <div className="space-y-4 pt-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">1</span>
                  <span>Install Cloudflared in Termux</span>
                </span>
                <button
                  onClick={() => copyToClipboard('pkg update && pkg install cloudflared -y', 'cf-step-1')}
                  className="flex items-center space-x-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white hover:bg-white/10"
                >
                  {copiedKey === 'cf-step-1' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'cf-step-1' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="mt-2 rounded-xl bg-black/60 p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                pkg update && pkg install cloudflared -y
              </pre>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">2</span>
                  <span>Start the Free Tunnel (Forward Port 3000)</span>
                </span>
                <button
                  onClick={() => copyToClipboard('cloudflared tunnel --url http://localhost:3000', 'cf-step-2')}
                  className="flex items-center space-x-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white hover:bg-white/10"
                >
                  {copiedKey === 'cf-step-2' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'cf-step-2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="mt-2 rounded-xl bg-black/60 p-3 font-mono text-xs text-amber-300 overflow-x-auto">
                cloudflared tunnel --url http://localhost:3000
              </pre>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <span className="text-xs font-bold text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>3. Open the Generated HTTPS URL on your TV</span>
              </span>
              <p className="mt-1.5 text-xs text-[#A1A1AA]">
                Termux will output a link resembling: <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded">https://movie-room-xxx.trycloudflare.com</span>. Type that into your TV's browser. It connects instantly with full SSL security!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Local Wi-Fi & Port Forwarding */}
      {activeTab === 'local' && (
        <div className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Local Wi-Fi Connection & Router Port Forwarding
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Direct high-speed local stream • No internet data consumption
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Finding your Phone IP in Termux</span>
              </h4>
              <p className="text-xs text-[#A1A1AA]">
                Open Termux and run either of these commands:
              </p>
              <div className="flex items-center justify-between rounded-xl bg-black/60 p-3 font-mono text-xs text-white">
                <span>ifconfig wlan0 || ip -br addr</span>
                <button
                  onClick={() => copyToClipboard('ifconfig wlan0', 'local-ip-cmd')}
                  className="rounded bg-white/10 px-2 py-1 text-[11px] text-[#A1A1AA] hover:text-white"
                >
                  {copiedKey === 'local-ip-cmd' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-[#71717A]">
                Look for the <strong>inet</strong> address (e.g. <code>192.168.1.45</code>).
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                <Radio className="h-4 w-4 text-amber-400" />
                <span>Router Port Forwarding (Optional for External Access)</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                If your TV is on a different VLAN or Wi-Fi band, configure your Wi-Fi Router's Port Forwarding page:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#A1A1AA] font-mono">
                <li>Internal IP: <span className="text-white">&lt;Your Phone IP&gt;</span></li>
                <li>Internal Port: <span className="text-indigo-400">3000</span></li>
                <li>External Port: <span className="text-indigo-400">3000</span></li>
                <li>Protocol: <span className="text-emerald-400">TCP</span></li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>ADB Reverse Port Forwarding (Direct USB or Wireless ADB)</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                If your Android TV has Developer Options and Wireless ADB enabled, forward port 3000 directly:
              </p>
              <div className="flex items-center justify-between rounded-xl bg-black/60 p-3 font-mono text-xs text-white">
                <span>adb reverse tcp:3000 tcp:3000</span>
                <button
                  onClick={() => copyToClipboard('adb reverse tcp:3000 tcp:3000', 'adb-cmd')}
                  className="rounded bg-white/10 px-2 py-1 text-[11px] text-[#A1A1AA] hover:text-white"
                >
                  {copiedKey === 'adb-cmd' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-[#71717A]">
                Once reversed, you can simply open <code>http://localhost:3000</code> right in your TV's browser!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Ngrok Secure Proxy */}
      {activeTab === 'ngrok' && (
        <div className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Ngrok Secure Public Proxy
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Expose Termux server with encrypted public HTTPS tunnel
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <span className="text-xs font-bold text-white">1. Install and Auth Ngrok in Termux</span>
              <p className="text-xs text-[#A1A1AA]">
                Sign up for a free account at ngrok.com to get your Authtoken.
              </p>
              <div className="rounded-xl bg-black/60 p-3 font-mono text-xs text-white space-y-1">
                <p className="text-[#71717A]"># Add your authtoken:</p>
                <p className="text-emerald-400">ngrok config add-authtoken &lt;YOUR_TOKEN&gt;</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">2. Launch Tunnel for Port 3000</span>
                <button
                  onClick={() => copyToClipboard('ngrok http 3000', 'ngrok-cmd')}
                  className="flex items-center space-x-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white hover:bg-white/10"
                >
                  {copiedKey === 'ngrok-cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'ngrok-cmd' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="rounded-xl bg-black/60 p-3 font-mono text-xs text-indigo-300">
                ngrok http 3000
              </pre>
              <p className="text-xs text-[#A1A1AA]">
                Ngrok will display a <strong>Forwarding</strong> address like <code>https://xxxx.ngrok-free.app</code>. Open this in your TV browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: TV Chrome Tricks & Fixes */}
      {activeTab === 'chrome_tv' && (
        <div className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Resolving Chrome on Android TV "Not Secure" & Blank Screen
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Quick overrides if you prefer connecting via plain local IP
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">A</span>
                <span>Type explicit `http://` without 's'</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Smart TV Chrome automatically adds <code>https://</code> if you omit it. Manually type:
              </p>
              <p className="font-mono text-xs text-white bg-black/50 p-2 rounded-lg">
                http://192.168.x.x:3000
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">B</span>
                <span>The `thisisunsafe` Chrome Bypass</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                If Chrome shows "Your connection is not private" and has no Proceed button: click anywhere on the page and type <strong>thisisunsafe</strong> with your remote or phone keyboard app.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">C</span>
                <span>Disable "Always use secure connections"</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                In Chrome on Android TV: Go to <strong>Settings</strong> &gt; <strong>Privacy and Security</strong> &gt; Turn OFF <strong>"Always use secure connections"</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">D</span>
                <span>Keep Termux Running (Wake Lock)</span>
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Android battery saver can freeze Termux when your phone screen turns off. Run:
              </p>
              <div className="flex items-center justify-between rounded-lg bg-black/50 p-2 font-mono text-xs text-white">
                <span>termux-wake-lock</span>
                <button
                  onClick={() => copyToClipboard('termux-wake-lock', 'wake-cmd')}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[#A1A1AA]"
                >
                  {copiedKey === 'wake-cmd' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
