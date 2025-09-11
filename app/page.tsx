"use client";
import { BURN_ADDRESS, VOTE_ABI, VOTING_ADDRESS, BASE_CHAIN_ID } from "../lib/constants";


import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from "@coinbase/onchainkit/transaction";
import type { LifecycleStatus } from "@coinbase/onchainkit/transaction";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button, Card } from "./components/DemoComponents";
import { ethers } from "ethers";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { walletConnect, coinbaseWallet } from "@wagmi/connectors";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { base } from "wagmi/chains";
import "./theme.css";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import '@rainbow-me/rainbowkit/styles.css';
import { useMiniKit } from '@coinbase/onchainkit/minikit';



/* ---------- FX helpers (spark trail + parallax) ---------- */
function useSparkTrail(enabled = true) {
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "burnie-spark-canvas";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "5",
    });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const sparks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }[] = [];
    const colors = ["#ff4500", "#ff8c00", "#ffd166"] as const;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = "touches" in e ? e.touches[0] : (e as MouseEvent);
      const lastX = p.clientX;
      const lastY = p.clientY;
      for (let i = 0; i < 6; i++) {
        sparks.push({
          x: lastX + (Math.random() - 0.5) * 6,
          y: lastY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -Math.random() * 1.2 - 0.3,
          life: 1,
          color: colors[(Math.random() * colors.length) | 0],
        });
      }
    };
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.02;
        s.life -= 0.02;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("resize", onResize);
      canvas.remove();
    };
  }, [enabled]);
}
function useParallax(ref: React.RefObject<HTMLElement>, strength = 12) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(-dy * strength).toFixed(
        2
      )}deg) rotateY(${(dx * strength).toFixed(2)}deg)`;
    };
    const onLeave = () => {
      el.style.transform = "translateZ(0)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [ref, strength]);
}

// Minimal typing for WalletConnect Modal CSS variables
type WcThemeVars = Partial<Record<
  | "--wcm-accent-color"
  | "--wcm-accent-fill-color"
  | "--wcm-background-color"
  | "--wcm-foreground-color"
  | "--wcm-primary-color"
  | "--wcm-secondary-color"
  | "--wcm-text-secondary-color"
  | "--wcm-overlay-background"
  | "--wcm-font-family"
  | "--wcm-z-index",
  string
>>;

const wcDarkVars: WcThemeVars = {
  "--wcm-accent-color": "#ff4500",
  "--wcm-accent-fill-color": "#ffffff",
  "--wcm-background-color": "#111111",
  "--wcm-foreground-color": "#1a1a1a",
  "--wcm-primary-color": "#ffffff",
  "--wcm-secondary-color": "#d1d5db",
  "--wcm-text-secondary-color": "#d1d5db",
  "--wcm-overlay-background": "rgba(0,0,0,0.66)",
  "--wcm-font-family":
    'Geist, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  "--wcm-z-index": "2147483647",
};

function inWarpcastWebview(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent ?? "";
  // Warpcast UA typically contains "Warpcast" or "Farcaster"
  return /Warpcast|Farcaster/i.test(ua);
}


/* ---------- Ignite ripple helper ---------- */
const ignite = (e: React.MouseEvent<HTMLElement | Element>) => {
  const t = e.currentTarget as HTMLElement;
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty("--ix", `${e.clientX - r.left - r.width / 2}px`);
  t.style.setProperty("--iy", `${e.clientY - r.top - r.height / 2}px`);
  t.classList.remove("is-igniting");
  void t.offsetWidth;
  t.classList.add("is-igniting");
};
// 0x v2 "native token" sentinel (works cross-chain, incl. Base)
const NATIVE_ETH: `0x${string}` =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
/* ---------- Spacetime warp flash ---------- */
function fireWarp() {
  if (typeof window === "undefined") return;
  try {
    const el = document.createElement("div");
    el.className = "warp-overlay";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  } catch {}
}
function openInCoinbaseDapp(url?: string) {
  if (typeof window === "undefined") return;
  const target = url || window.location.href; // your live page
  // Universal link that opens CW's in-app browser on your URL
  const deeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(
    target
  )}`;
  window.location.href = deeplink;
}
/* ---------- Wallet UI (OnchainKit) ---------- */
const DynamicWallet = dynamic(
  () => import("@coinbase/onchainkit/wallet").then((mod) => mod.Wallet),
  { ssr: false }
);
const DynamicWalletDropdown = dynamic(
  () => import("@coinbase/onchainkit/wallet").then((mod) => mod.WalletDropdown),
  { ssr: false }
);
const DynamicWalletDropdownDisconnect = dynamic(
  () =>
    import("@coinbase/onchainkit/wallet").then(
      (mod) => mod.WalletDropdownDisconnect
    ),
  { ssr: false }
);
/* ---------- Voting options + Art mapping ---------- */
const VOTING_OPTIONS = [
  "💎 Learn Mister Dementors Origins",
  "🔥❄️🌌 Explore Space",
  "🔥❄️🌿 Find Flora",
] as const;
const ART_MAP: Record<number, { src: string; alt: string }> = {
  0: { src: "/art/dementor-origins.jpg", alt: "Mister Dementors Origins" },
  1: { src: "/art/explore-space.jpg", alt: "Explore Space" },
  2: { src: "/art/find-flora.jpg", alt: "Find Flora" },
};
/* ======================================================================= */
/* 🔥 Coinbase Wallet Native Swap */
/* ======================================================================= */
function getCoinbaseWallet(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.ethereum?.isCoinbaseWallet ? w.ethereum : null;
}
function inCoinbaseMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  const mini = w.miniapp || w.MiniApp || w.__CBW_MINIAPP__ || w.cbwMiniApp;
  return !!mini && typeof mini === "object";
}
function inCoinbaseWalletDappBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent ?? "";
  const eth = (window as any)?.ethereum;
  return (/CoinbaseWallet/i.test(ua) || !!eth?.isCoinbaseWallet) && !inCoinbaseMiniApp();
}
function inCoinbaseAppWebview(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent ?? "";
  return /Coinbase/i.test(ua) && !/CoinbaseWallet/i.test(ua);
}
async function openCoinbaseWalletSwap(params: {
  to: string;
  chainId: number;
  amount?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Client-side only" };
  }

  try {
    const swapArgs = {
      to: params.to,
      chainId: params.chainId,
      amount: params.amount || "0.01",
      inputCurrency: NATIVE_ETH,
      outputCurrency: params.to,
    };

    // 🟢 1. Coinbase Mini App tab → native swap sheet
    const mini = (window as any).miniapp || (window as any).MiniApp;
    if (mini?.wallet) {
      if (typeof mini.wallet.swap === "function") {
        await mini.wallet.swap(swapArgs);
        return { ok: true };
      }
      if (typeof mini.wallet.open === "function") {
        await mini.wallet.open({ route: "swap", ...swapArgs });
        return { ok: true };
      }
    }

    // 🟠 2. Coinbase Wallet browser → use Uniswap fallback
    if (inCoinbaseWalletDappBrowser()) {
      const uniswapUrl = `https://app.uniswap.org/#/swap?chain=base&inputCurrency=ETH&outputCurrency=${params.to}&exactAmount=${swapArgs.amount}`;
      window.open(uniswapUrl, "_blank");
      return {
        ok: true,
        reason: "Opened Uniswap fallback inside Coinbase Wallet browser",
      };
    }

    // 🔵 3. Regular browser → try CW deeplink first, then Uniswap fallback
    const deeplinkApp = `cbwallet://wallet/swap?to=${encodeURIComponent(params.to)}&chainId=${params.chainId}&amount=${encodeURIComponent(swapArgs.amount)}&inputCurrency=ETH&outputCurrency=${encodeURIComponent(params.to)}`;
const deeplinkHttps = `https://go.cb-w.com/wallet/swap?to=${encodeURIComponent(params.to)}&chainId=${params.chainId}&amount=${encodeURIComponent(swapArgs.amount)}&inputCurrency=ETH&outputCurrency=${encodeURIComponent(params.to)}`;

// Try app protocol first; if blocked, fall back to HTTPS universal link
const t = setTimeout(() => { window.location.assign(deeplinkHttps); }, 400);
window.location.assign(deeplinkApp);
setTimeout(() => clearTimeout(t), 1500);


    // Fallback to Uniswap if deeplink does nothing after 1s
    setTimeout(() => {
      if (document.visibilityState === "visible") {
        const uniswapUrl = `https://app.uniswap.org/#/swap?chain=base&inputCurrency=ETH&outputCurrency=${params.to}&exactAmount=${swapArgs.amount}`;
        window.open(uniswapUrl, "_blank");
      }
    }, 1000);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

/* ---------- Page ---------- */
export default function App() {
  useSparkTrail(true);
 // Tell the Base App we’re ready once the frame is mounted
const { setFrameReady, isFrameReady } = useMiniKit();

useEffect(() => {
  // Only call once after mount; guard against re-calls
  if (!isFrameReady) {
    // Let the UI paint first to avoid double-initialization warnings
    requestAnimationFrame(() => setFrameReady());
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isFrameReady, setFrameReady]);

  const [balance, setBalance] = useState("0");
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [previewVote, setPreviewVote] = useState<number | null>(null);
  const [votes, setVotes] = useState<string[]>(["0", "0", "0"]);
  const [hasUserVoted, setHasUserVoted] = useState([false, false, false]);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [readAck, setReadAck] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swapAmount, setSwapAmount] = useState("0.01");
  const [ethBal, setEthBal] = useState<string>("0");
  const [swapWarning, setSwapWarning] = useState<string>("");
  const [estGasEth, setEstGasEth] = useState<number>(0.0002);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isCwWebview, setIsCwWebview] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  // RainbowKit: programmatic open of the connect modal
const { openConnectModal } = useConnectModal();
  const prevVotedAnyRef = useRef<boolean>(false);
  const track = (name: string) => {
    try {
      console.log("[analytics]", name);
    } catch {}
  };
  /* ---------- Provider ---------- */
  const rpcUrls = [
    "https://base-rpc.publicnode.com",
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
  ];
  const provider = useMemo(() => {
    for (const url of rpcUrls) {
      try {
        return new ethers.JsonRpcProvider(url);
      } catch {}
    }
    setError("All RPCs failed. Check network connectivity.");
    setNotification({
      message: "All RPCs failed. Check network connectivity.",
      type: "error",
    });
    return null;
  }, []);
    /* ---------- WalletConnect ---------- */
  const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  const wcConnector = useMemo(() => {
    if (!wcProjectId) return null;
    return walletConnect({
      projectId: wcProjectId,
      showQrModal: false, // ⬅️ important on mobile (we'll guide users to CW instead)
      metadata: {
        name: "BurnieVerse",
        description: "Vote on the lore for BurnieVerse on Base",
        url: process.env.NEXT_PUBLIC_URL || "https://theburnieverse.vercel.app",
        icons: [
          process.env.NEXT_PUBLIC_ICON_URL ||
            "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg",
        ],
      },
    });
  }, [wcProjectId]);
  async function openWalletConnect(e?: React.MouseEvent) {
  try {
    if (e) ignite(e);

    // A) If we’re in Coinbase Mini App or CW dapp browser, WC isn’t needed
    if (isMiniApp || isCwWebview) {
      setNotification({ message: "WalletConnect not needed in Coinbase Wallet.", type: "info" });
      return;
    }

    // B) On mobile (incl. Warpcast webview), prefer the RainbowKit connect modal
    if (typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)) {
      if (openConnectModal) {
        openConnectModal();
        return;
      }
    }

    // C) Desktop (or fallback) → connect via WC programmatically
    if (!wcConnector) {
      setNotification({ message: "WalletConnect is not configured.", type: "error" });
      return;
    }
    await connect({ connector: wcConnector });
  } catch (err) {
    // D) As a last resort, show the WalletConnect QR modal (desktop)
    if (!wcProjectId || isMiniApp || isCwWebview) return;
    try {
      const mod = await import("@walletconnect/modal");

      if (!(window as any).walletConnectModal) {
        (window as any).walletConnectModal = new mod.WalletConnectModal({
          projectId: wcProjectId,
          themeMode: "dark",
          explorerRecommendedWalletIds: "NONE",
          themeVariables: wcDarkVars,
        });
      }

      await (window as any).walletConnectModal.openModal();
    } catch {
      setNotification({ message: "Couldn’t open WalletConnect. Please check configuration.", type: "error" });
    }
  }
}

  async function openCoinbaseWallet(e?: React.MouseEvent) {
    try {
      if (e) ignite(e);
      if (typeof window !== "undefined" && isMobile && !isMiniApp) {
        const returnUrl = window.location.href;
        const deeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(
          returnUrl
        )}`;
        window.location.href = deeplink;
        return;
      }
      const appName = "BurnieVerse";
      const appLogoUrl =
        process.env.NEXT_PUBLIC_ICON_URL ||
        "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg";
      await connect({
        connector: coinbaseWallet({
          appName,
          appLogoUrl,
        }),
      });
    } catch {
      setNotification({
        message:
          "Couldn’t open Coinbase Wallet. Make sure the app/extension is installed.",
        type: "error",
      });
    }
  }
  /* ---------- Persist readAck ---------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bv_readAck");
      if (saved === "1") setReadAck(true);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (readAck) localStorage.setItem("bv_readAck", "1");
    } catch {}
  }, [readAck]);
  /* ---------- Open modal once when any hasVoted[i] flips to true ---------- */
  useEffect(() => {
    const votedAny = hasUserVoted.some(Boolean);
    if (votedAny && !prevVotedAnyRef.current) {
      try {
        localStorage.setItem("bv_postvote_seen", "1");
      } catch {}
      console.log("[postvote] opened via hasUserVoted transition");
      setShowPostVote(true);
    }
    prevVotedAnyRef.current = votedAny;
  }, [hasUserVoted]);
  async function estimateEthForGasBase(
    provider: any,
    gasLimitGuess = 140_000
  ): Promise<number> {
    try {
      const feeData = await provider.getFeeData();
      const wei = (feeData.maxFeePerGas ?? feeData.gasPrice) ?? BigInt(0);
      const estWei = wei * BigInt(gasLimitGuess);
      return Number(ethers.formatEther(estWei));
    } catch {
      return 0.0002;
    }
  }
  useEffect(() => {
    let t: any;
    (async () => {
      if (!provider) return;
      const run = async () => {
        const g = await estimateEthForGasBase(provider);
        setEstGasEth(g);
      };
      await run();
      t = setInterval(run, 15000);
    })();
    return () => t && clearInterval(t);
  }, [provider]);
  /* ---------- Mount / env info ---------- */
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
      setIsMiniApp(inCoinbaseMiniApp());
      setIsCwWebview(inCoinbaseWalletDappBrowser());
      try {
        console.log("[env]", {
          isMiniApp: inCoinbaseMiniApp(),
          isCwWebview: inCoinbaseWalletDappBrowser(),
          isCoinbaseAppWebview: inCoinbaseAppWebview(),
          ua: navigator.userAgent,
        });
      } catch {}
    }
  }, []);

  // Force WalletConnect (Web3Modal) dark theme + colors
useEffect(() => {
  try {
    // Make sure the modal renders in dark mode
    document.documentElement.setAttribute('data-wcm-theme', 'dark');
    const root = document.documentElement.style;

    // Set WC modal CSS variables (fallbacks if init options are ignored)
    root.setProperty('--wcm-accent-color', '#ff4500');
    root.setProperty('--wcm-background-color', '#0b0e14');
    root.setProperty('--wcm-primary-color', '#ffffff');
    root.setProperty('--wcm-text-secondary-color', '#d1d5db');
    root.setProperty('--wcm-overlay-background', 'rgba(0,0,0,0.66)');
    root.setProperty('--wcm-font-family', 'Geist, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif');
  } catch {}
}, []);


  // If user lands inside Coinbase Wallet's dapp browser and isn't connected,
// pop the RainbowKit modal automatically to complete the connection.
useEffect(() => {
  if (!isMounted) return;
  let done = false; // guard for a single open per visit
  if (!isConnected && isCwWebview && openConnectModal && !done) {
    done = true;
    setTimeout(() => openConnectModal(), 400); // let UI settle first
  }
}, [isMounted, isCwWebview, isConnected, openConnectModal]);

  /* ---------- Voting readouts ---------- */
  const BURN_READ_ABI = [
    "function balanceOf(address) view returns (uint256)",
  ] as const;
  const initWallet = async () => {
    try {
      if (!isConnected || !address) {
        setError("");
        return;
      }
      if (!ethers.isAddress(VOTING_ADDRESS)) {
        setError("Invalid voting contract address!");
        setNotification({
          message: "Invalid voting contract address!",
          type: "error",
        });
        return;
      }
      if (!ethers.isAddress(BURN_ADDRESS)) {
        setError("Invalid $BURN contract address!");
        setNotification({
          message: "Invalid $BURN contract address!",
          type: "error",
        });
        return;
      }
      if (!provider) {
        setError("RPC connection failed. Try again later.");
        setNotification({
          message: "RPC connection failed. Try again later.",
          type: "error",
        });
        return;
      }
      const burnContract = new ethers.Contract(
        BURN_ADDRESS,
        BURN_READ_ABI,
        provider
      );
      try {
        const userBal = await burnContract.balanceOf(address);
        setBalance(ethers.formatEther(userBal));
      } catch (err) {
        setError(`Balance check failed: ${(err as Error).message}`);
        setNotification({
          message: `Balance check failed: ${(err as Error).message}`,
          type: "error",
        });
        throw err;
      }
      await fetchVotes();
      await checkHasVoted();
      setError("");
      setNotification({
        message: "Wallet initialized successfully!",
        type: "success",
      });
    } catch (err) {
      setError(`Init error: ${(err as Error).message}`);
      setNotification({
        message: `Init error: ${(err as Error).message}`,
        type: "error",
      });
    }
  };
  useEffect(() => {
    if (!isConnected) {
      setBalance("0");
      return;
    }
    initWallet();
    const interval = setInterval(fetchVotes, 10_000);
    return () => clearInterval(interval);
  }, [isConnected, address, provider]);
  const fetchVotes = async () => {
    try {
      if (!ethers.isAddress(VOTING_ADDRESS) || !provider) return;
      const voteContract = new ethers.Contract(VOTING_ADDRESS, VOTE_ABI, provider);
      const rawVotes: bigint[] = await Promise.all(
        VOTING_OPTIONS.map((_, i) => voteContract.getVote(i))
      );
      setVotes(rawVotes.map((v) => ethers.formatEther(v)));
    } catch (err) {
      setNotification({ message: "Failed to fetch votes!", type: "error" });
    }
  };
  const checkHasVoted = async (): Promise<boolean[] | null> => {
    if (!address || !ethers.isAddress(VOTING_ADDRESS) || !provider) return null;
    try {
      const voteContract = new ethers.Contract(VOTING_ADDRESS, VOTE_ABI, provider);
      const voted = await Promise.all(
        VOTING_OPTIONS.map((_, i) => voteContract.hasVoted(i, address))
      );
      setHasUserVoted(voted);
      return voted;
    } catch (err) {
      setNotification({
        message: "Failed to check voting status!",
        type: "error",
      });
      return null;
    }
  };
  /* ---------- ETH balance + health checks ---------- */
  useEffect(() => {
    (async () => {
      try {
        if (!provider || !address) return;
        const bal = await provider.getBalance(address);
        setEthBal(ethers.formatEther(bal));
      } catch {}
    })();
  }, [address, provider]);
  useEffect(() => {
    if (!readAck) return;
    (async () => {
      await fetchVotes();
      const voted = await checkHasVoted();
      if (voted?.some(Boolean)) {
        try {
          localStorage.setItem("bv_postvote_seen", "1");
        } catch {}
        setShowPostVote(true);
      }
    })();
  }, [readAck, address, provider]);
  useEffect(() => {
    const amt = Number(swapAmount || "0");
    const bal = Number(ethBal || "0");
    if (!amt) {
      setSwapWarning("");
      return;
    }
    if (amt <= 0) {
      setSwapWarning("Enter a positive amount.");
      return;
    }
    const gas = Number(estGasEth || 0.0002);
    if (amt + gas > bal) {
      setSwapWarning(
        `Amount + est. gas (${gas.toFixed(6)} ETH) exceeds your balance.`
      );
    } else if (amt < 0.0005) {
      setSwapWarning("Amount is very small; slippage and fees may dominate.");
    } else {
      setSwapWarning("");
    }
  }, [swapAmount, ethBal, estGasEth]);
  /* ---------- BUY / SWAP flow ---------- */
async function handleBuyBurnClick(
  e?: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
) {
  try {
    if (e) {
      ignite(e as any);
      e.preventDefault();
      e.stopPropagation();
    }

    const amt = Number(swapAmount || "0");
    if (!Number.isFinite(amt) || amt <= 0) {
      setNotification({ message: "Enter a valid ETH amount.", type: "error" });
      return;
    }

    if (!address) {
      setNotification({
        message: "Connect your wallet first.",
        type: "error",
      });
      return;
    }

    track("swap_initiated");

    const { ok, reason } = await openCoinbaseWalletSwap({
      to: BURN_ADDRESS,
      chainId: BASE_CHAIN_ID,
      amount: String(amt),
    });

    if (!ok) {
      setNotification({
        message: `Swap failed: ${reason || "Unknown error"}`,
        type: "error",
      });
      return;
    }

    // Success path
    setNotification({
      message: "Swap initiated in Coinbase Wallet — confirm in your app.",
      type: "success",
    });

    // Refresh balances shortly after
    setTimeout(() => initWallet(), 2500);
  } catch (err) {
    setNotification({
      message: `Swap error: ${String(err)}`,
      type: "error",
    });
  }
}


  /* ---------- Tx lifecycle ---------- */
  const handleOnStatus = useCallback(
    (status: LifecycleStatus) => {
      const name = (status as any)?.statusName as string;
      try {
        console.log("[tx status]", name, status);
      } catch {}
      const successNames = new Set([
        "success",
        "confirmed",
        "executed",
        "transactionExecuted",
        "transactionMined",
        "transactionLegacyExecuted",
        "transactionConfirmed",
      ]);
      if (successNames.has(name)) {
        fetchVotes();
        checkHasVoted();
        setNotification({
          message: `Voted for ${VOTING_OPTIONS[selectedVote ?? 0]}!`,
          type: "success",
        });
        try {
          localStorage.setItem("bv_postvote_seen", "1");
        } catch {}
        setShowPostVote(true);
        try {
          if ("vibrate" in navigator) (navigator as any).vibrate?.(30);
        } catch {}
        const burst = document.createElement("div");
        burst.className = "emoji-burst";
        burst.textContent = ["🔥", "✨", "🗳️", "🪐"][Math.floor(Math.random() * 4)];
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 900);
        return;
      }
      if (name === "reverted" || name === "failed") {
        const msg =
          (status as any).statusData?.message ||
          (status as any).statusData?.reason ||
          (status as any).statusData?.code ||
          "Unknown error";
        setError(`${name} - ${msg}`);
        setNotification({
          message: `Transaction ${name}: ${msg}`,
          type: "error",
        });
        return;
      }
      if (name === "error") {
        const errorMsg =
          (status as any).statusData?.code ||
          (status as any).statusData?.message ||
          "Unknown error";
        setError(
          `Transaction error: ${errorMsg} - ${JSON.stringify(
            (status as any).statusData,
            null,
            2
          )}`
        );
        setNotification({
          message: `Transaction error: ${errorMsg}`,
          type: "error",
        });
        return;
      }
      if (name) {
        setNotification({ message: `Transaction status: ${name}`, type: "info" });
      }
    },
    [selectedVote]
  );
  /* ---------- Build OCK Calls ---------- */
  const voteIface = useMemo(() => new ethers.Interface(VOTE_ABI), []);
  const voteCalls = useMemo(() => {
    if (selectedVote === null || !ethers.isAddress(VOTING_ADDRESS)) {
      return [];
    }
    const data = voteIface.encodeFunctionData("vote", [
      selectedVote,
    ]) as `0x${string}`;
    const to = VOTING_ADDRESS as `0x${string}`;
    return [{ to, data }];
  }, [selectedVote, voteIface]);
  const handleVoteFx = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (Number(balance) > 0 && selectedVote !== null) {
        ignite(e);
        try {
          fireWarp();
        } catch {}
      }
    },
    [balance, selectedVote]
  );
  /* ---------- Connect picker ---------- */
  useEffect(() => {
    try {
      const seen = localStorage.getItem("bv_postvote_seen");
      if (!seen) {
      }
    } catch {}
  }, []);
  /* ---------- Totals ---------- */
  const voteNums = votes.map((v) => parseFloat(v || "0"));
  const totalVotes = voteNums.reduce((a, b) => a + b, 0);
  const percents = voteNums.map((v) =>
    totalVotes ? Math.round((v * 100) / totalVotes) : 0
  );
  const formatVote = (n: number | string) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
  /* ---------- Hotkeys ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (!readAck) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      const isTopRow = e.key === "1" || e.key === "2" || e.key === "3";
      const isNumpad =
        e.code === "Numpad1" || e.code === "Numpad2" || e.code === "Numpad3";
      const idx =
        (isTopRow ? Number(e.key) : Number(e.code.replace("Numpad", ""))) - 1;
      if (
        idx >= 0 &&
        idx < VOTING_OPTIONS.length &&
        !hasUserVoted[idx] &&
        !hasUserVoted.some(Boolean)
      ) {
        setSelectedVote(idx);
        setPreviewVote(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readAck, hasUserVoted]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (!readAck) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      if (
        e.key === "Enter" &&
        selectedVote !== null &&
        !hasUserVoted.some(Boolean) &&
        !hasUserVoted[selectedVote]
      ) {
        const btn =
          document.querySelector<HTMLButtonElement>('[data-cta="vote"]');
        btn?.click();
      }
      if (e.key === "Escape") {
        setSelectedVote(null);
        setPreviewVote(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readAck, selectedVote, hasUserVoted]);
  /* ---------- Parallax + preload ---------- */
  const heroShellRef = useRef<HTMLDivElement>(null);
  useParallax(heroShellRef, 10);
  useEffect(() => {
    if (typeof window === "undefined") return;
    Object.values(ART_MAP).forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  const activeArtIdx = previewVote ?? selectedVote;
  /* ---------- Refresh after returning from swap ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(() => {
          fetchVotes().catch(() => {});
          if (address && provider) {
            const burn = new ethers.Contract(
              BURN_ADDRESS,
              BURN_READ_ABI,
              provider
            );
            burn
              .balanceOf(address)
              .then((bal: bigint) => setBalance(ethers.formatEther(bal)))
              .catch(() => {});
          }
        }, 300);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [address, provider]);
  const CHAPTER1_LINK =
    "https://based-burnie.gitbook.io/burnieverse/the-story/chapter-1-the-great-divide";
  /* ---------- Post-vote celebration state ---------- */
  const [showPostVote, setShowPostVote] = useState(false);
  const debugOpenPostVote = () => {
    try {
      localStorage.setItem("bv_postvote_seen", "1");
    } catch {}
    console.log("[postvote] opening modal (debug/manual)");
    setShowPostVote(true);
  };
  return (
    <>
      <style jsx global>{`
        /* Keep entry button above overlays */
        .connect-wallet {
          position: relative;
          z-index: 60;
        }
        /* --- Base-blue "I'm ready" CTA --- */
        .ready-cta--base {
          position: relative;
          background: #0052ff;
          color: #fff !important;
          border: 1px solid rgba(0, 82, 255, 0.65);
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          letter-spacing: 0.2px;
          box-shadow: 0 8px 22px rgba(0, 82, 255, 0.35),
            inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          transition: transform 0.15s ease, box-shadow 0.2s ease,
            background 0.2s ease, filter 0.2s ease;
          overflow: hidden;
          isolation: isolate;
        }
        /* Prevent size flash on the "I'm ready" button */
        .btn-no-shift {
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica,
            Arial, sans-serif !important;
          font-weight: 800;
          font-size: 14px;
          line-height: 20px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(0, 82, 255, 0.65);
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ready-cta--base:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(0, 82, 255, 0.55),
            0 0 0 4px rgba(0, 82, 255, 0.18);
          filter: saturate(1.08);
        }
        .ready-cta--base:active {
          transform: translateY(0);
          box-shadow: 0 6px 16px rgba(0, 82, 255, 0.45),
            0 0 0 2px rgba(0, 82, 255, 0.22);
        }
        .ready-cta--base:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8),
            0 0 0 6px rgba(0, 82, 255, 0.6);
        }
        .ready-cta--base::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(
            120deg,
            transparent 0%,
            rgba(255, 255, 255, 0.18) 20%,
            transparent 42%
          );
          transform: translateX(-120%);
          pointer-events: none;
        }
        .ready-cta--base:hover::after {
          animation: burnieSheen 0.9s ease forwards;
        }
        @keyframes burnieSheen {
          to {
            transform: translateX(120%);
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ready-cta--base {
            animation: burniePulse 2.4s ease-in-out infinite;
          }
          @keyframes burniePulse {
            0% {
              box-shadow: 0 8px 22px rgba(0, 82, 255, 0.35),
                0 0 0 0 rgba(0, 82, 255, 0);
            }
            70% {
              box-shadow: 0 8px 22px rgba(0, 82, 255, 0.35),
                0 0 0 14px rgba(0, 82, 255, 0);
            }
            100% {
              box-shadow: 0 8px 22px rgba(0, 82, 255, 0.35),
                0 0 0 0 rgba(0, 82, 255, 0);
            }
          }
        }
        .chip--bright {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.16),
            rgba(255, 255, 255, 0.08)
          );
          border: 1px solid rgba(255, 255, 255, 0.45);
          color: #fff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        .hero-stage {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--app-card-border);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          background: #000;
          margin-bottom: 0.5rem;
        }
        .hero-aspect {
          aspect-ratio: 16/9;
          width: 100%;
        }
        .hero-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.28s ease;
        }
        .hero-layer.show {
          opacity: 1;
        }
        .hero-layer.hide {
          opacity: 0;
          visibility: hidden;
        }
        .hero-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 75%,
            rgba(0, 0, 0, 0.18) 100%
          );
        }
        .btn-ghost,
        .btn-ghost:visited {
          color: #fff !important;
        }
        .btn-ghost:hover,
        .btn-ghost:active,
        .btn-ghost:focus {
          color: #fff !important;
        }
        .swap-body a {
          color: #fff !important;
          text-decoration: none;
        }
        .swap-body a:hover {
          text-decoration: none;
        }
        .swap-overlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          background: radial-gradient(
            1200px 800px at 50% 20%,
            rgba(255, 69, 0, 0.12),
            rgba(0, 0, 0, 0.75)
          );
          animation: fadeIn 0.15s ease-out;
          backdrop-filter: blur(6px);
        }
        .swap-card {
          width: min(720px, 92vw);
          border-radius: 16px;
          border: 1px solid rgba(255, 140, 0, 0.35);
          background: linear-gradient(
              180deg,
              rgba(255, 140, 0, 0.12),
              rgba(0, 0, 0, 0.3)
            ),
            var(--app-card-bg, #0b0e14);
          box-shadow: 0 0 0 1px rgba(255, 140, 0, 0.1) inset,
            0 16px 50px rgba(255, 69, 0, 0.25);
          padding: 16px;
        }
        .swap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .swap-title {
          font-weight: 800;
          letter-spacing: 0.2px;
          background: linear-gradient(90deg, #ffd166, #ff8c00, #ff4500);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .swap-body {
          padding: 8px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.35);
        }
        .swap-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        .btn-ghost {
          border: 1px solid rgba(255, 140, 0, 0.35);
          background: rgba(255, 69, 0, 0.08);
          color: #ffd7a3;
          border-radius: 10px;
          padding: 0.45rem 0.7rem;
          font-weight: 700;
        }
        .btn-ghost:hover {
          background: rgba(255, 69, 0, 0.14);
        }
        .close-x {
          cursor: pointer;
          opacity: 0.8;
        }
        .close-x:hover {
          opacity: 1;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .swap-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          margin-top: 8px;
        }
        .swap-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 140, 0, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          color: #fff;
          font-weight: 600;
        }
        .swap-mini-hint {
          font-size: 11px;
          opacity: 0.75;
          margin-top: 6px;
        }
        .swap-box {
          display: grid;
          gap: 12px;
          margin-top: 10px;
        }
        .swap-row {
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid rgba(255, 140, 0, 0.25);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.45);
        }
        .swap-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .swap-token-line {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px;
          align-items: center;
        }
        .swap-token-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.3px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 140, 0, 0.4);
          background: rgba(255, 69, 0, 0.1);
          color: #ffd7a3;
        }
        .swap-token-badge.burn {
          border-color: rgba(255, 140, 0, 0.5);
          background: rgba(255, 69, 0, 0.16);
        }
        .swap-input.tight {
          padding: 8px 10px;
        }
        .swap-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .swap-balance {
          font-size: 11px;
          opacity: 0.8;
        }
        .swap-divider {
          text-align: center;
          opacity: 0.75;
          font-size: 14px;
        }
        .fixed.top-4.right-4 {
          z-index: 40;
        }
        @media (max-width: 380px) {
          .swap-card {
            width: min(680px, 94vw);
            padding: 12px;
          }
          .swap-input {
            padding: 8px 10px;
          }
          .swap-row {
            padding: 8px;
          }
        }
      `}</style>
      <div className="flex flex-col min-h-screen font-sans text-[var(--foreground)] mini-app-theme">
        <div className="w-full max-w-md mx-auto px-4 py-6 relative">
          {notification && (
            <div
              className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg animate-fade-in z-40 ${
                notification.type === "success"
                  ? "bg-[var(--ock-bg-success)] text-[var(--ock-text-success)]"
                  : notification.type === "error"
                  ? "bg-[var(--ock-bg-error)] text-[var(--ock-text-error)]"
                  : "bg-[var(--app-gray)] text-[var(--foreground)]"
              }`}
            >
              {notification.message}
              <button
                className="ml-4 text-[var(--foreground)]"
                onClick={() => setNotification(null)}
              >
                ✕
              </button>
            </div>
          )}
          {/* Header: single entry + picker */}
          <header className="relative z-50 mb-4">
  {isMounted && (
    <div className="flex items-center justify-between gap-2 h-12">
      {!isConnected ? (
        <div className="relative flex items-center gap-2 w-full">
          {/* A) Inside Coinbase Mini App OR Coinbase Wallet's dapp browser */}
          {(isMiniApp || isCwWebview) ? (
            <button
              type="button"
              className="ready-cta--base w-full sm:w-auto"
              onClick={() => {
                try {
                  const href =
                    typeof window !== "undefined" ? window.location.href : "";
                  const deeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(
                    href
                  )}`;
                  window.location.href = deeplink;
                } catch {}
              }}
              aria-label="Open in Coinbase Wallet"
            >
              ↗ Open in Coinbase Wallet
            </button>
          ) : (
            <>
              {/* B) On mobile Safari/Chrome (NOT in Coinbase) → show two buttons */}
              {isMobile ? (
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    className="ready-cta--base flex-1"
                    onClick={() => {
                      try {
                        const href =
                          typeof window !== "undefined"
                            ? window.location.href
                            : "";
                        const deeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(
                          href
                        )}`;
                        window.location.href = deeplink;
                      } catch {}
                    }}
                    aria-label="Open in Coinbase Wallet"
                  >
                    ↗ Open in Coinbase Wallet
                  </button>

                  {/* "Other Wallets" = RainbowKit modal trigger */}
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        className="ignite chip chip--bright px-3 py-2 rounded-lg font-semibold"
                        style={{ minHeight: 44 }}
                        aria-label="Connect with other wallets"
                      >
                        Other Wallets
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              ) : (
                /* C) Desktop → standard RainbowKit button with all options */
                <ConnectButton
                  showBalance
                  chainStatus="icon"
                  accountStatus="address"
                />
              )}
            </>
          )}

          {readAck && (
            <button
              type="button"
              className="ignite chip chip--bright ml-auto"
              onClick={() => {
                setReadAck(false);
                try {
                  localStorage.removeItem("bv_readAck");
                } catch {}
                setSelectedVote(null);
                setPreviewVote(null);
              }}
              title="Return to main page"
            >
              ← Back to intro
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap w-full">
          <DynamicWallet>
            <DynamicWalletDropdown>
              <Identity className="px-4 pt-3 pb-2 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)]" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <DynamicWalletDropdownDisconnect />
            </DynamicWalletDropdown>
          </DynamicWallet>

          <button
            type="button"
            className="ignite chip chip--bright"
            onClick={async () => {
              await disconnect();
              setBalance("0");
              setSelectedVote(null);
              setPreviewVote(null);
              setError("");
              setNotification(null);
            }}
            title="Disconnect wallet"
          >
            🔌 Disconnect
          </button>

          {readAck && (
            <button
              type="button"
              className="ignite chip chip--bright"
              onClick={() => {
                setReadAck(false);
                try {
                  localStorage.removeItem("bv_readAck");
                } catch {}
                setSelectedVote(null);
                setPreviewVote(null);
              }}
              title="Return to main page"
            >
              ← Back to intro
            </button>
          )}
        </div>
      )}
    </div>
  )}
</header>


          {!address && (
            <p className="error-message text-sm text-[var(--ock-text-error)]">
              Connect your wallet to check balance and vote!
            </p>
          )}
          <main className="flex-1 flex flex-col gap-4">
            <Card>
              {/* Legendary HERO */}
              <div ref={heroShellRef} className="hero-stage">
                <div className="hero-aspect">
                  <div
                    className={`hero-layer ${
                      activeArtIdx == null ? "show" : "hide"
                    }`}
                  >
                    <video
                      className="hero-media animate-burnie-glow"
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster="/burnie-fallback.jpg"
                    >
                      <source src="/burnie-loop.mp4" type="video/mp4" />
                    </video>
                  </div>
                  {isMounted && (
                    <>
                      <div
                        className={`hero-layer ${
                          activeArtIdx === 0 ? "show" : "hide"
                        }`}
                      >
                        <img
                          className="hero-media"
                          src="/art/dementor-origins.jpg"
                          alt="Mister Dementors Origins"
                        />
                      </div>
                     <div
                        className={`hero-layer ${
                          activeArtIdx === 1 ? "show" : "hide"
                        }`}
                      >
                        <img
                          className="hero-media"
                          src="/art/explore-space.jpg"
                          alt="Explore Space"
                        />
                      </div>
                      <div
                        className={`hero-layer ${
                          activeArtIdx === 2 ? "show" : "hide"
                        }`}
                      >
                        <img
                          className="hero-media"
                          src="/art/find-flora.jpg"
                          alt="Find Flora"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="hero-overlay" />
              </div>
              <h1 className="text-lg font-bold mb-2 animate-fade-in">
                BurnieVerse Chapter Two: Vote the Lore! 🔥🪐
              </h1>
              {error && address && (
                <p className="error-message text-[var(--ock-text-error)] text-sm mb-2 animate-fade-in">
                  {error}
                </p>
              )}
              {!readAck ? (
                <Card className="border-[var(--app-card-border)] rounded-md mb-4 animate-fade-in">
                  <img
                    src="https://pbs.twimg.com/media/Gx6YBP2WMAAUDUl.jpg"
                    alt="Split fire-ice realm"
                    className="w-full rounded mb-2 animate-burnie-glow"
                  />
                  <h2 className="text-base font-semibold">
                    Read Chapter 1 First!
                  </h2>
                  <p className="text-sm">
                    Dive into "The Great Divide" to shape Chapter 2.
                  </p>
                  <div className="ready-block mt-3">
                    <a
                      href={CHAPTER1_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ignite read-now-btn inline-flex items-center justify-center rounded-lg font-medium transition-all bg-[var(--app-accent)] text-[var(--background)] hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent-active)] px-3 py-2 text-sm"
                      onClick={ignite}
                    >
                      Read Now
                    </a>
                    <button
                      type="button"
                      className="ready-cta--base"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        minHeight: 44,
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(0, 82, 255, 0.65)",
                        fontFamily:
                          'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
                        fontWeight: 800,
                        fontSize: 14,
                        lineHeight: "20px",
                        color: "#fff",
                        WebkitTextFillColor: "#fff",
                        background: "#0052ff",
                        transition:
                          "transform .15s ease, box-shadow .2s ease, filter .2s ease",
                      }}
                      onMouseDown={(e) => ignite(e)}
                      onClick={async () => {
                        fireWarp();
                        const voted = await checkHasVoted();
                        setReadAck(true);
                        if (voted?.some(Boolean)) {
                          try {
                            localStorage.setItem("bv_postvote_seen", "1");
                          } catch {}
                          setShowPostVote(true);
                        }
                      }}
                      aria-label="I'm ready to vote"
                    >
                      ✅ I’m ready to vote
                    </button>
                    <span className="ready-hint text-[var(--ock-text-foreground-muted)]">
                      You can still open Chapter 1 in a new tab and come back.
                    </span>
                  </div>
                </Card>
              ) : null}
              {!ethers.isAddress(VOTING_ADDRESS) ? (
                <p className="error-message text-sm">
                  Voting contract not deployed—update VOTING_ADDRESS!
                </p>
              ) : readAck ? (
                <Card className="flex flex-col gap-3 animate-fade-in">
                  <p className="text-sm">
                    Your $BURN Balance (Vote Weight): {balance}
                  </p>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="chip"
                      title="Sum of all weighted votes (BURN held at vote time)"
                    >
                      🧮 Total weighted votes: {formatVote(totalVotes)}
                    </span>
                    <div className="flex items-center gap-1" aria-label="Quick choose">
                      <span className="cta-hint mr-1">Hotkeys</span>
                      {[1, 2, 3].map((n) => (
                        <span key={n} className="kbd">{n}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">
                    Votes are <strong>weighted</strong> by your $BURN balance at
                    the time you vote. One vote per wallet per poll.
                  </p>
                  <div
                    className="ballot"
                    title="Hotkeys: 1/2/3 select • Enter casts • Esc clears"
                  >
                    {VOTING_OPTIONS.map((opt, i) => {
                      const voted = hasUserVoted[i];
                      const pct = percents[i];
                      const hasVotedAny = hasUserVoted.some(Boolean);
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`ignite ballot-row ${
                            selectedVote === i ? "ballot-row--active" : ""
                          }`}
                          onMouseEnter={() => setPreviewVote(i)}
                          onFocus={() => setPreviewVote(i)}
                          onMouseLeave={() => setPreviewVote(selectedVote)}
                          onBlur={() => setPreviewVote(selectedVote)}
                          onClick={(e) => {
                            ignite(e);
                            if (!hasVotedAny) {
                              setSelectedVote(i);
                              setPreviewVote(i);
                            }
                          }}
                          disabled={hasVotedAny || voted}
                          aria-pressed={selectedVote === i}
                          title={`Choose option ${i + 1}`}
                        >
                          <div className="ballot-top">
                            <span className="ballot-label">{opt}</span>
                            <span className="ballot-right">
                              <span className="ballot-votes">
                                {formatVote(voteNums[i])}
                              </span>
                              <span className="ballot-pct">{pct}%</span>
                            </span>
                          </div>
                          <div className="ballot-bar">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          {voted && (
                            <span className="ballot-tag">✔️ You voted</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVote !== null && !hasUserVoted.some(Boolean) && (
                    <>
                      <Transaction
                        chainId={base.id}
                        calls={voteCalls}
                        isSponsored={false}
                        onStatus={handleOnStatus}
                      >
                        <div role="none" onMouseDown={handleVoteFx}>
                          <TransactionButton
                            className={`ignite legendary-cta ${
                              selectedVote !== null ? "legendary-cta--armed" : ""
                            }`}
                            disabled={
                              selectedVote === null || Number(balance) <= 0
                            }
                            text={
                              Number(balance) > 0
                                ? "Cast Vote (you pay gas)"
                                : "Need $BURN to Vote"
                            }
                            data-cta="vote"
                          />
                        </div>
                        <TransactionStatus>
                          <TransactionStatusLabel />
                          <TransactionStatusAction />
                        </TransactionStatus>
                      </Transaction>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span
                          className="chip"
                          title="You will pay Base gas fees"
                        >
                          🪙 Base fees are tiny
                        </span>
                        <span
                          className="chip"
                          title="Have a small amount of ETH on Base"
                        >
                          💡 Needs a tiny bit of ETH (Base)
                        </span>
                        {Number(balance) <= 0 && (
                          <button
                            type="button"
                            onClick={handleBuyBurnClick}
                            className="chip chip--white"
                            title="Get $BURN to gain vote weight"
                          >
                            🔥 Buy $BURN
                          </button>
                        )}
                      </div>
                      {(isMiniApp || isCwWebview) && (
                        <span className="text-[10px] opacity-70 mt-1 block">
                          Built on Base with OnchainKit and MiniApp
                        </span>
                      )}
                    </>
                  )}
                </Card>
              ) : (
                <p className="error-message text-sm text-center w-full">
                  Unlock voting above!
                </p>
              )}
            </Card>
          </main>
          <div className="buy-burn-button w-full flex justify-center sm:justify-center">
            <button
              type="button"
              className="ignite mx-auto inline-flex items-center justify-center rounded-lg font-medium transition-all bg-[var(--app-accent)] text-[var(--background)] hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent-active)] px-3 py-1 text-sm"
              onClick={handleBuyBurnClick}
            >
              🔥 Buy More $BURN to Boost Your Vote!
            </button>
            {(isMiniApp || isCwWebview) && (
              <span className="text-[10px] opacity-70 mt-1 block text-center w-full">
                Powered by Coinbase Wallet Swap on Base
              </span>
            )}
          </div>
          <footer className="mt-4 pt-4 flex justify-center">
            <p
              className="cursor-pointer text-[var(--ock-text-foreground-muted)] text-xs"
              onClick={() =>
                window.open("https://base.org/builders/minikit", "_blank")
              }
            >
              🔥 Forged on Base. Fueled by $BURN. Written by you.
            </p>
          </footer>
        </div>
      </div>
      {/* Inline Swap Modal */}
      {showSwap && (
        <div className="swap-overlay" role="dialog" aria-modal="true">
          <div className="swap-card">
            <div className="swap-header">
              <h3 className="swap-title text-lg">Burnie Swap — Base 🔥</h3>
              <button
                className="close-x btn-ghost"
                onClick={() => setShowSwap(false)}
                aria-label="Close swap"
              >
                ✕
              </button>
            </div>
            <div className="swap-body text-sm">
              <p>
                Swap ETH → <strong>$BURN</strong> using Coinbase Wallet on Base.
                You stay in-app.
              </p>
              <div className="swap-form">
                <input
                  className="swap-input"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={swapAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (Number(v) < 0) return;
                    setSwapAmount(v);
                  }}
                  placeholder="Amount in ETH (e.g., 0.01)"
                  inputMode="decimal"
                  aria-label="Amount in ETH"
                />
                <button
                  className="btn-ghost"
                  onClick={handleBuyBurnClick}
                  title="Open Coinbase swap"
                  disabled={!!swapWarning || !Number(swapAmount)}
                >
                  🔥 Swap now
                </button>
              </div>
              <div className="swap-box">
                <div className="swap-row">
                  <div className="swap-row-top">
                    <span className="swap-min-label">Sell</span>
                    <span className="swap-balance">
                      Balance: {Number(ethBal || "0").toFixed(6)} ETH
                    </span>
                  </div>
                  <div className="swap-token-line">
                    <span className="swap-token-badge">ETH</span>
                    <input
                      className="swap-input tight"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={swapAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (Number(v) < 0) return;
                        setSwapAmount(v);
                      }}
                      placeholder="0.00"
                      inputMode="decimal"
                      aria-label="Amount in ETH"
                    />
                  </div>
                  <div className="swap-quick">
                    <button
                      type="button"
                      className="chip chip--bright"
                      onClick={() => {
                        track("swap_max");
                        setSwapAmount(ethBal);
                      }}
                      title="Max"
                    >
                      Max
                    </button>
                    <button
                      type="button"
                      className="chip chip--bright"
                      onClick={() =>
                        setSwapAmount(
                          Math.max(0, Number(ethBal || "0") - 0.0003).toFixed(6)
                        )
                      }
                      title="Max (keep gas)"
                    >
                      Max-gas
                    </button>
                    <button
                      type="button"
                      className="chip chip--bright"
                      onClick={() =>
                        setSwapAmount((Number(ethBal || "0") / 2).toFixed(6))
                      }
                      title="Half"
                    >
                      ½
                    </button>
                    <button
                      type="button"
                      className="chip chip--bright"
                      onClick={() =>
                        setSwapAmount(
                          (Number(swapAmount || "0") + 0.01).toFixed(4)
                        )
                      }
                      title="+0.01 ETH"
                    >
                      +0.01
                    </button>
                  </div>
                </div>
                <div className="swap-divider" aria-hidden="true">
                  ↓
                </div>
                <div className="swap-row">
                  <div className="swap-row-top">
                    <span className="swap-min-label">Buy</span>
                    <span className="swap-balance">$BURN</span>
                  </div>
                  <div className="swap-token-line">
                    <span className="swap-token-badge burn">$BURN</span>
                    <input
                      className="swap-input tight"
                      disabled
                      placeholder="Auto via wallet"
                      aria-label="Amount of $BURN (estimated in wallet)"
                    />
                  </div>
                </div>
              </div>
              {swapWarning ? (
                <div className="swap-min-msg" style={{ color: "#ffb7b7" }}>
                  {swapWarning}
                </div>
              ) : (
                <div className="swap-min-msg">
                  Base gas is tiny. Your wallet will show the live quote and min
                  received.
                </div>
              )}
              <div className="swap-mini-hint">
                Estimated gas on Base: ~{estGasEth.toFixed(6)} ETH
              </div>
              <div className="swap-actions">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    track("swap_deeplink");
                    const amt = Number(swapAmount || "0") || 0.01;
                    const deeplink = `cbwallet://wallet/swap?to=${encodeURIComponent(
                      BURN_ADDRESS
                    )}&chainId=${BASE_CHAIN_ID}&amount=${encodeURIComponent(
                      String(amt)
                    )}`;
                    if (typeof window !== "undefined") {
                      window.location.assign(deeplink);
                    }
                  }}
                  title="Open in Coinbase Wallet"
                >
                  ↗ Open in Coinbase Wallet
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setShowSwap(false)}
                >
                  Done
                </button>
              </div>
              <p className="swap-mini-hint">
                Tip: If nothing opens, disable “Open links externally” in CW dev
                settings or tap “Open in Coinbase Wallet” above.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Post-vote Celebration Modal */}
      {showPostVote && (
        <div className="swap-overlay" role="dialog" aria-modal="true">
          <div className="swap-card">
            <div className="swap-header">
              <h3 className="swap-title text-lg">You voted! 🔥</h3>
              <button
                className="close-x btn-ghost"
                onClick={() => setShowPostVote(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="swap-body text-sm">
              <p className="mb-2">
                Thanks for shaping Chapter 2. Keep the fire going:
              </p>
              <div className="swap-actions">
                <a
                  className="btn-ghost"
                  href="https://twitter.com/intent/follow?screen_name=BasedBurnie"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow on X"
                  onClick={() => track("cta_follow_x")}
                >
                  🐦 Follow @BasedBurnie
                </a>
                <a
                  className="btn-ghost"
                  href="https://basedburnie.xyz/?utm_source=miniapp&utm_medium=vote_cta&utm_campaign=chapter2"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visit the site"
                  onClick={() => track("cta_site")}
                >
                  🔥 Explore basedburnie.xyz
                </a>
                <a
                  className="btn-ghost"
                  href="https://t.me/basedburnie"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Join our Telegram"
                  onClick={() => track("cta_telegram")}
                >
                  📲 Join Telegram
                </a>
                <a
                  className="btn-ghost"
                  href={
                    "https://twitter.com/intent/tweet?text=" +
                    encodeURIComponent(
                      "I just voted in #BurnieVerse Chapter 2! 🔥🪐 Join the story: https://basedburnie.xyz"
                    )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share your vote"
                  onClick={() => track("cta_share_x")}
                >
                  📣 Share on X
                </a>
              </div>
              <p className="swap-mini-hint">
                Tip: You’ll see more choices as the story unfolds.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}