import { useEffect } from "react"
import { motion } from "framer-motion"

export default function NotFound() {
    // Optional: auto-redirect to home after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = "/" // redirect to home in React
        }, 5000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-black text-white px-6">
            <motion.h1
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-8xl md:text-[10rem] font-extrabold text-orange-500 mb-6"
            >
                404
            </motion.h1>

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold mb-4"
            >
                Page Not Found
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-zinc-400 max-w-md text-center mb-8"
            >
                The page you are looking for does not exist. You can go back to the homepage.
            </motion.p>

            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                onClick={() => (window.location.href = "/")} // redirect to home
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8 py-4 rounded-full transition"
            >
                Go to Home
            </motion.button>
        </section>
    )
}