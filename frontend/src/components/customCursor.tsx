import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement | null>(null);
    const sparklesRef = useRef<HTMLDivElement[]>([]);
    const lastPos = useRef({ x: 0, y: 0 });
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        document.documentElement.style.cursor = "none";
        document.body.style.cursor = "none";

        const styleTag = document.createElement("style");
        styleTag.id = "cursor-hide-style";
        styleTag.textContent = `* { cursor: none !important; }`;
        document.head.appendChild(styleTag);

        return () => {
            document.documentElement.style.cursor = "";
            document.body.style.cursor = "";

            const existing = document.getElementById("cursor-hide-style");
            if (existing) existing.remove();
        };
    }, []);

    useEffect(() => {
        const container = document.getElementById("sparkle-container");

        const spawnStar = (x: number, y: number) => {
            if (!container) return;

            const star = document.createElement("div");

            const size = Math.random() * 4 + 2;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 24 + 6;
            const duration = Math.random() * 500 + 400;

            // Aunova hero palette
            const colors = [
                "#6172F2", // brand indigo
                "#8B5CF6", // violet
                "#7C3AED", // purple
                "#06B6D4", // cyan
                "#10B981", // emerald
                "#FFFFFF", // white
            ];

            const color =
                colors[Math.floor(Math.random() * colors.length)];

            star.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 9998;

                width: ${size}px;
                height: ${size}px;

                background: ${color};
                border-radius: 50%;

                left: ${x}px;
                top: ${y}px;

                transform: translate(-50%, -50%);
                opacity: 1;

                box-shadow:
                    0 0 6px ${color},
                    0 0 12px ${color};

                transition:
                    transform ${duration}ms ease-out,
                    opacity ${duration}ms ease-out;
            `;

            container.appendChild(star);
            sparklesRef.current.push(star);

            // Force reflow
            star.getBoundingClientRect();

            star.style.transform = `
                translate(
                    ${Math.cos(angle) * distance - 50}%,
                    ${Math.sin(angle) * distance - 50}%
                )
                scale(0.2)
            `;

            star.style.opacity = "0";

            setTimeout(() => {
                if (star.parentNode) {
                    star.parentNode.removeChild(star);
                }

                sparklesRef.current =
                    sparklesRef.current.filter((s) => s !== star);
            }, duration + 50);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const { clientX: x, clientY: y } = e;

            setPos({ x, y });
            setVisible(true);

            const dx = x - lastPos.current.x;
            const dy = y - lastPos.current.y;

            const speed = Math.sqrt(dx * dx + dy * dy);

            lastPos.current = { x, y };

            if (speed > 3) {
                const count = Math.min(
                    Math.floor(speed / 8) + 1,
                    6
                );

                for (let i = 0; i < count; i++) {
                    spawnStar(x, y);
                }
            }
        };

        const handleMouseLeave = () => setVisible(false);
        const handleMouseEnter = () => setVisible(true);

        window.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("mouseenter", handleMouseEnter);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("mouseenter", handleMouseEnter);
        };
    }, []);

    return (
        <>
            {/* Sparkle container */}
            <div
                id="sparkle-container"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 9998,
                }}
            />

            {/* Custom Aunova cursor */}
            <div
                ref={cursorRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 9999,

                    transform: `translate(${pos.x}px, ${pos.y}px)`,

                    opacity: visible ? 1 : 0,

                    transition: "opacity 0.2s ease",

                    willChange: "transform",
                }}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                        filter: `
                            drop-shadow(0 0 4px rgba(97,114,242,0.8))
                            drop-shadow(0 0 8px rgba(139,92,246,0.5))
                        `,
                    }}
                >
                    <defs>
                        <linearGradient
                            id="cursorGradient"
                            x1="3"
                            y1="3"
                            x2="21"
                            y2="21"
                        >
                            <stop
                                offset="0%"
                                stopColor="#6172F2"
                            />

                            <stop
                                offset="55%"
                                stopColor="#8B5CF6"
                            />

                            <stop
                                offset="100%"
                                stopColor="#7C3AED"
                            />
                        </linearGradient>
                    </defs>

                    <path
                        d="M3 3L21 12L12 15L9 21L3 3Z"
                        fill="url(#cursorGradient)"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </>
    );
}