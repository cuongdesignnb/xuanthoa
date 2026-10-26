"use client";

/**
 * Trình phát video bài học.
 * - Video upload: HLS mã hoá AES-128, khoá cấp qua token ngắn hạn (tự làm mới), chặn tải/chuột phải/PiP,
 *   watermark email người xem di chuyển.
 * - YouTube: youtube-nocookie qua IFrame API, lớp phủ trong suốt chặn logo/"sao chép link", dùng chung thanh điều khiển.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Captions, Loader2, Lock, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from "lucide-react";
import type HlsType from "hls.js";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type VideoPlayerProps = {
  /** Bài học (để backend kiểm tra quyền xem và cấp token). */
  lessonId?: string;
  /** Video upload (bảng videos). */
  videoId?: string | null;
  /** ID YouTube (11 ký tự) hoặc URL đầy đủ. */
  youtube?: string | null;
  poster?: string | null;
  className?: string;
  /** Gọi định kỳ khi đang phát (giây hiện tại, tổng giây). */
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
  /** Tua tới giây này khi giá trị thay đổi. */
  seekTo?: number;
};

type TokenRes =
  | { source: "youtube"; youtubeId: string | null; title?: string }
  | { source: "upload"; token: string; expiresAt: number; ttl: number; url: string; poster: string | null; durationSec: number | null; title?: string; watermark: string | null };

export function youtubeIdOf(input?: string | null) {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  return s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;
}

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const sec = String(v % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

const SPEEDS = [1, 1.25, 1.5, 2];

/* ------------------------------------------------------------------ */
/* Engine chung cho HLS và YouTube                                     */
/* ------------------------------------------------------------------ */

type Engine = {
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setRate: (r: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
};

type PlayState = { playing: boolean; current: number; duration: number; buffered: number; waiting: boolean; started: boolean };
const INIT: PlayState = { playing: false, current: 0, duration: 0, buffered: 0, waiting: false, started: false };

export default function VideoPlayer(props: VideoPlayerProps) {
  const { lessonId, videoId, youtube } = props;
  const ytDirect = youtubeIdOf(youtube);
  const needToken = !ytDirect && !!(lessonId || videoId);
  const [res, setRes] = useState<{ key: string; data?: TokenRes; error?: ApiError } | null>(null);
  const key = `${lessonId ?? ""}|${videoId ?? ""}`;

  const fetchToken = useCallback(async (): Promise<TokenRes> => {
    if (lessonId) return api<TokenRes>(`/public/lessons/${lessonId}/video-token`);
    return api<TokenRes>(`/me/videos/${videoId}/token`, { method: "POST", body: {} });
  }, [lessonId, videoId]);

  useEffect(() => {
    if (!needToken) return;
    let alive = true;
    fetchToken()
      .then((data) => alive && setRes({ key, data }))
      .catch((e) => alive && setRes({ key, error: e instanceof ApiError ? e : new ApiError(0, String(e)) }));
    return () => {
      alive = false;
    };
  }, [needToken, fetchToken, key]);

  const shell = (children: React.ReactNode) => (
    <div className={`relative aspect-video overflow-hidden rounded-2xl bg-ink shadow-xl shadow-ink/10 ring-1 ring-ink/10 ${props.className ?? ""}`}>{children}</div>
  );

  if (ytDirect) return <YouTubePlayer {...props} youtubeId={ytDirect} />;
  if (!needToken)
    return shell(<div className="grid size-full place-items-center text-sm text-white/60">Chưa có video</div>);

  const cur = res?.key === key ? res : null;
  if (!cur)
    return shell(
      <>
        {props.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.poster} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-white/80" />
        </div>
      </>,
    );
  if (cur.error) return shell(<LockedState error={cur.error} poster={props.poster} />);
  const data = cur.data!;
  if (data.source === "youtube") {
    if (!data.youtubeId) return shell(<div className="grid size-full place-items-center text-sm text-white/60">Chưa có video</div>);
    return <YouTubePlayer {...props} youtubeId={data.youtubeId} />;
  }
  return <HlsPlayer {...props} initial={data} refetch={fetchToken} />;
}

function LockedState({ error, poster }: { error: ApiError; poster?: string | null }) {
  const login = error.status === 401;
  const locked = error.status === 403 || login;
  const next = typeof window !== "undefined" ? window.location.pathname : "/";
  return (
    <>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-30 blur-sm" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-ink/40 to-ink/80 p-6 text-center text-white">
        <span className="grid size-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <Lock className="size-6" />
        </span>
        <p className="text-base font-bold sm:text-lg">{locked ? (login ? "Đăng nhập để xem bài học này" : "Đăng ký khóa học để xem bài này") : error.message}</p>
        {locked && (
          <p className="max-w-sm text-xs text-white/70 sm:text-sm">
            {login ? "Bài học dành cho học viên. Vui lòng đăng nhập để tiếp tục." : "Bài học này chỉ dành cho học viên đã đăng ký khóa học."}
          </p>
        )}
        {login && (
          <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold shadow-lg shadow-brand-500/30 transition hover:bg-brand-600">
            Đăng nhập
          </Link>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* HLS (video upload)                                                   */
/* ------------------------------------------------------------------ */

function HlsPlayer({
  initial,
  refetch,
  poster,
  className,
  onProgress,
  onEnded,
  seekTo,
}: VideoPlayerProps & { initial: Extract<TokenRes, { source: "upload" }>; refetch: () => Promise<TokenRes> }) {
  const { user } = useAuth();
  const video = useRef<HTMLVideoElement>(null);
  const tokenRef = useRef(initial.token);
  const [state, setState] = useState<PlayState>({ ...INIT, duration: initial.durationSec ?? 0 });
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt);
  const hlsRef = useRef<HlsType | null>(null);
  const cbs = useRef({ onProgress, onEnded });
  useEffect(() => {
    cbs.current = { onProgress, onEnded };
  });

  const refresh = useCallback(async () => {
    const r = await refetch();
    if (r.source === "upload") {
      tokenRef.current = r.token;
      setExpiresAt(r.expiresAt);
    }
    return r;
  }, [refetch]);

  // Làm mới token ~60 giây trước khi hết hạn.
  useEffect(() => {
    const ms = Math.max(15_000, expiresAt * 1000 - Date.now() - 60_000);
    const t = setTimeout(() => void refresh().catch(() => {}), ms);
    return () => clearTimeout(t);
  }, [expiresAt, refresh]);

  // Gắn nguồn HLS.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let destroyed = false;
    const withToken = (url: string) => url.replace(/([?&]t=)[^&]*/, `$1${encodeURIComponent(tokenRef.current)}`);
    let retries = 0;

    (async () => {
      const { default: Hls } = await import("hls.js");
      if (destroyed) return;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr, url) => {
            xhr.open("GET", withToken(url), true);
          },
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, async (_e, data) => {
          if (!data.fatal) return;
          const code = (data.response as { code?: number } | undefined)?.code;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < 3) {
            retries++;
            if (code === 401 || code === 403) await refresh().catch(() => {});
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retries < 3) {
            retries++;
            hls.recoverMediaError();
          } else setError("Không phát được video. Vui lòng tải lại trang.");
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          retries = 0;
        });
        hls.loadSource(initial.url);
        hls.attachMedia(el);
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = initial.url; // Safari: HLS gốc
      } else setError("Trình duyệt không hỗ trợ phát video này.");
    })();

    // Safari: khi token hết hạn giữa chừng → lấy token mới và nạp lại tại vị trí cũ.
    const onErr = async () => {
      if (hlsRef.current || retries >= 3) return;
      retries++;
      const at = el.currentTime;
      const wasPlaying = !el.paused;
      try {
        const r = await refresh();
        if (r.source !== "upload") return;
        el.src = r.url;
        el.currentTime = at;
        if (wasPlaying) void el.play();
      } catch {
        setError("Phiên xem đã hết hạn. Vui lòng tải lại trang.");
      }
    };
    el.addEventListener("error", onErr);
    return () => {
      destroyed = true;
      el.removeEventListener("error", onErr);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [initial.url, refresh]);

  // Sự kiện của <video>.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let lastEmit = 0;
    const upd = () =>
      setState((s) => ({
        ...s,
        playing: !el.paused && !el.ended,
        current: el.currentTime,
        duration: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : s.duration,
        buffered: el.buffered.length ? el.buffered.end(el.buffered.length - 1) : 0,
      }));
    const onTime = () => {
      upd();
      const now = Date.now();
      if (now - lastEmit > 1000) {
        lastEmit = now;
        cbs.current.onProgress?.(el.currentTime, Number.isFinite(el.duration) ? el.duration : 0);
      }
    };
    const onPlay = () => setState((s) => ({ ...s, playing: true, started: true }));
    const onWaiting = () => setState((s) => ({ ...s, waiting: true }));
    const onPlaying = () => setState((s) => ({ ...s, waiting: false, playing: true, started: true }));
    const onEnd = () => {
      upd();
      cbs.current.onProgress?.(el.duration, el.duration);
      cbs.current.onEnded?.();
    };
    const evs: [string, () => void][] = [
      ["timeupdate", onTime],
      ["progress", upd],
      ["durationchange", upd],
      ["pause", upd],
      ["play", onPlay],
      ["waiting", onWaiting],
      ["playing", onPlaying],
      ["canplay", () => setState((s) => ({ ...s, waiting: false }))],
      ["ended", onEnd],
    ];
    evs.forEach(([n, f]) => el.addEventListener(n, f));
    return () => evs.forEach(([n, f]) => el.removeEventListener(n, f));
  }, []);

  useEffect(() => {
    const el = video.current;
    if (el && typeof seekTo === "number" && Number.isFinite(seekTo)) el.currentTime = Math.max(0, seekTo);
  }, [seekTo]);

  const engine: Engine = {
    play: () => void video.current?.play().catch(() => {}),
    pause: () => video.current?.pause(),
    seek: (t) => {
      if (video.current) video.current.currentTime = Math.max(0, Math.min(t, video.current.duration || t));
    },
    setRate: (r) => {
      if (video.current) video.current.playbackRate = r;
    },
    setVolume: (v) => {
      if (video.current) video.current.volume = v;
    },
    setMuted: (m) => {
      if (video.current) video.current.muted = m;
    },
  };

  const watermark = initial.watermark ?? user?.email ?? null;

  return (
    <PlayerChrome className={className} state={state} engine={engine} poster={poster ?? initial.poster} error={error} watermark={watermark} fullscreenVideo={video}>
      <video
        ref={video}
        className="absolute inset-0 size-full bg-black object-contain"
        poster={poster ?? initial.poster ?? undefined}
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
      />
    </PlayerChrome>
  );
}

/* ------------------------------------------------------------------ */
/* YouTube                                                              */
/* ------------------------------------------------------------------ */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow: boolean): void;
  setPlaybackRate(r: number): void;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};

let ytPromise: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      ytPromise = null;
      reject(new Error("Không tải được YouTube"));
    };
    document.head.appendChild(s);
  });
  return ytPromise;
}

function YouTubePlayer({ youtubeId, poster, className, onProgress, onEnded, seekTo }: VideoPlayerProps & { youtubeId: string }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayState>(INIT);
  const [error, setError] = useState<string | null>(null);
  const cbs = useRef({ onProgress, onEnded });
  useEffect(() => {
    cbs.current = { onProgress, onEnded };
  });

  useEffect(() => {
    let alive = true;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadYT()
      .then((YT) => {
        if (!alive) return;
        player.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: youtubeId,
          width: "100%",
          height: "100%",
          playerVars: { rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, cc_load_policy: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              if (!alive) return;
              setReady(true);
              setState((s) => ({ ...s, duration: player.current?.getDuration() ?? 0 }));
            },
            onStateChange: (e) => {
              // -1 chưa bắt đầu, 0 kết thúc, 1 đang phát, 2 tạm dừng, 3 đang tải
              setState((s) => ({ ...s, playing: e.data === 1, waiting: e.data === 3, started: s.started || e.data === 1 || e.data === 3 }));
              if (e.data === 0) {
                const d = player.current?.getDuration() ?? 0;
                cbs.current.onProgress?.(d, d);
                cbs.current.onEnded?.();
              }
            },
            onError: () => setError("Không phát được video YouTube này."),
          },
        });
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
      try {
        player.current?.destroy();
      } catch {
        /* noop */
      }
      player.current = null;
      mount.remove();
    };
  }, [youtubeId]);

  // Thăm dò thời gian khi đang phát.
  useEffect(() => {
    if (!ready) return;
    let last = 0;
    const id = setInterval(() => {
      const p = player.current;
      if (!p) return;
      const cur = p.getCurrentTime() || 0;
      const dur = p.getDuration() || 0;
      setState((s) => ({ ...s, current: cur, duration: dur || s.duration, buffered: (p.getVideoLoadedFraction() || 0) * dur }));
      if (p.getPlayerState() === 1 && Date.now() - last > 1000) {
        last = Date.now();
        cbs.current.onProgress?.(cur, dur);
      }
    }, 250);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (ready && typeof seekTo === "number" && Number.isFinite(seekTo)) player.current?.seekTo(Math.max(0, seekTo), true);
  }, [seekTo, ready]);

  const engine: Engine = {
    play: () => player.current?.playVideo(),
    pause: () => player.current?.pauseVideo(),
    seek: (t) => {
      player.current?.seekTo(Math.max(0, t), true);
      setState((s) => ({ ...s, current: t }));
    },
    setRate: (r) => player.current?.setPlaybackRate(r),
    setVolume: (v) => player.current?.setVolume(Math.round(v * 100)),
    setMuted: (m) => (m ? player.current?.mute() : player.current?.unMute()),
  };

  return (
    <PlayerChrome
      className={className}
      state={state}
      engine={engine}
      poster={poster ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
      error={error}
      loading={!ready && !error}
    >
      {/* iframe nằm dưới lớp phủ trong suốt (chặn click vào logo / "Sao chép link"); điều khiển qua IFrame API */}
      <div ref={host} className="pointer-events-none absolute inset-0 [&>iframe]:size-full" />
    </PlayerChrome>
  );
}

/* ------------------------------------------------------------------ */
/* Giao diện điều khiển dùng chung                                     */
/* ------------------------------------------------------------------ */

function PlayerChrome({
  children,
  className,
  state,
  engine,
  poster,
  error,
  loading,
  watermark,
  fullscreenVideo,
}: {
  children: React.ReactNode;
  className?: string;
  state: PlayState;
  engine: Engine;
  poster?: string | null;
  error?: string | null;
  loading?: boolean;
  watermark?: string | null;
  fullscreenVideo?: React.RefObject<HTMLVideoElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(0);
  const [volume, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fs, setFs] = useState(false);
  const [cc, setCc] = useState(false);
  const [idle, setIdle] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [wm, setWm] = useState({ x: 6, y: 8 });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playing, current, duration, buffered, waiting, started } = state;

  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Watermark di chuyển ngẫu nhiên.
  useEffect(() => {
    if (!watermark) return;
    const id = setInterval(() => setWm({ x: 4 + Math.random() * 62, y: 6 + Math.random() * 70 }), 6000);
    return () => clearInterval(id);
  }, [watermark]);

  const poke = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  };
  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, []);

  const toggle = () => {
    if (error) return;
    setFlash(playing ? "pause" : "play");
    setTimeout(() => setFlash(null), 450);
    if (playing) engine.pause();
    else engine.play();
  };

  const skip = (d: number) => engine.seek(Math.max(0, Math.min(duration || Infinity, current + d)));

  const pctAt = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const startSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    engine.seek(pctAt(e.clientX) * duration);
  };

  const changeVol = (v: number) => {
    setVol(v);
    engine.setVolume(v);
    if (v > 0 && muted) {
      setMuted(false);
      engine.setMuted(false);
    }
  };

  const fullscreen = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else (fullscreenVideo?.current as unknown as { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") {
      e.preventDefault();
      toggle();
    } else if (k === "arrowleft" || k === "j") {
      e.preventDefault();
      skip(k === "j" ? -10 : -5);
    } else if (k === "arrowright" || k === "l") {
      e.preventDefault();
      skip(k === "l" ? 10 : 5);
    } else if (k === "f") fullscreen();
    else if (k === "m") {
      setMuted(!muted);
      engine.setMuted(!muted);
    }
    poke();
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const showControls = !playing || !idle || !!error;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={box}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onMouseLeave={() => playing && setIdle(true)}
      onContextMenu={(e) => e.preventDefault()}
      className={`group/player relative aspect-video select-none overflow-hidden rounded-2xl bg-ink shadow-xl shadow-ink/10 outline-none ring-1 ring-ink/10 focus-visible:ring-2 focus-visible:ring-brand-400 ${fs ? "rounded-none" : ""} ${playing && idle ? "cursor-none" : ""} ${className ?? ""}`}
    >
      {children}

      {/* Ảnh bìa trước khi phát */}
      {!started && poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover" />
      )}

      {/* Lớp phủ trong suốt nhận click (chặn tương tác trực tiếp với iframe/video) */}
      <div className="absolute inset-0" onClick={toggle} onDoubleClick={fullscreen} />

      {watermark && (
        <span
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white/35 transition-all duration-[2000ms] ease-in-out [text-shadow:0_1px_2px_rgba(0,0,0,.35)] sm:text-xs"
          style={{ left: `${wm.x}%`, top: `${wm.y}%` }}
          aria-hidden
        >
          {watermark}
        </span>
      )}

      {cc && (
        <p className="pointer-events-none absolute bottom-[18%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-3 py-1 text-xs text-white sm:text-sm">Phụ đề chưa có cho video này</p>
      )}

      {(waiting || loading) && !error && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Loader2 className="size-10 animate-spin text-white/90" />
        </span>
      )}

      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0.9, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"
          >
            {flash === "play" ? <Play className="size-7 fill-white" /> : <Pause className="size-7 fill-white" />}
          </motion.span>
        )}
      </AnimatePresence>

      {!playing && !flash && !waiting && !loading && !error && current < 0.5 && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Phát"
          className="absolute left-1/2 top-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 transition hover:scale-105"
        >
          <Play className="size-7 fill-white" />
        </button>
      )}

      {error && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-6 text-center text-sm text-white">
          <p>{error}</p>
        </div>
      )}

      {/* Thanh điều khiển */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-2 pt-8 text-white transition-opacity duration-300 sm:px-4 sm:pb-3 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          ref={bar}
          onPointerDown={startSeek}
          onPointerMove={(e) => {
            setHover(pctAt(e.clientX));
            if (e.buttons === 1 && duration) engine.seek(pctAt(e.clientX) * duration);
          }}
          onPointerLeave={() => setHover(null)}
          className="group/bar relative h-4 cursor-pointer touch-none py-1.5"
          role="slider"
          aria-label="Tiến trình video"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(current)}
        >
          <div className="relative h-1 overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500 ring-2 ring-white/80 transition-transform group-hover/bar:scale-125"
            style={{ left: `${pct}%` }}
          />
          {hover !== null && duration > 0 && (
            <span className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] tabular-nums" style={{ left: `${hover * 100}%` }}>
              {fmt(hover * duration)}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? "Tạm dừng" : "Phát"} className="grid size-8 place-items-center rounded-md transition hover:bg-white/15">
            {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </button>
          <button type="button" onClick={() => skip(-10)} aria-label="Lùi 10 giây" className="relative grid size-8 place-items-center rounded-md transition hover:bg-white/15">
            <RotateCcw className="size-5" />
            <span className="absolute text-[7px] font-bold">10</span>
          </button>
          <button type="button" onClick={() => skip(10)} aria-label="Tới 10 giây" className="relative grid size-8 place-items-center rounded-md transition hover:bg-white/15">
            <RotateCw className="size-5" />
            <span className="absolute text-[7px] font-bold">10</span>
          </button>
          <div className="group/vol flex items-center">
            <button
              type="button"
              onClick={() => {
                setMuted(!muted);
                engine.setMuted(!muted);
              }}
              aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
              className="grid size-8 place-items-center rounded-md transition hover:bg-white/15"
            >
              <VolIcon className="size-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVol(Number(e.target.value))}
              aria-label="Âm lượng"
              className="hidden h-1 w-0 cursor-pointer accent-brand-500 transition-all duration-200 group-hover/vol:w-20 sm:block"
            />
          </div>
          <span className="ml-1 text-xs tabular-nums sm:text-sm">
            {fmt(current)} <span className="text-white/60">/ {fmt(duration)}</span>
          </span>
          <span className="flex-1" />
          <motion.button
            key={speed}
            type="button"
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            onClick={() => {
              const n = (speed + 1) % SPEEDS.length;
              setSpeed(n);
              engine.setRate(SPEEDS[n]);
            }}
            aria-label="Tốc độ phát"
            className="min-w-11 rounded-md px-1.5 py-1 text-xs font-semibold transition hover:bg-white/15 sm:text-sm"
          >
            {SPEEDS[speed]}x
          </motion.button>
          <button
            type="button"
            onClick={() => setCc((c) => !c)}
            aria-label="Phụ đề"
            aria-pressed={cc}
            className={`hidden size-8 place-items-center rounded-md transition hover:bg-white/15 sm:grid ${cc ? "text-brand-300" : ""}`}
          >
            <Captions className="size-5" />
          </button>
          <button type="button" aria-label={fs ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={fullscreen} className="grid size-8 place-items-center rounded-md transition hover:bg-white/15">
            {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
