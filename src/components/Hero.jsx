import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative pt-20 pb-12 px-5">

  <div className="max-w-6xl mx-auto">

    <p className="text-center text-zinc-500 uppercase tracking-[0.4em] text-xs">
      Cricket Rivalry
    </p>

    <h1
      className="
      text-center
      mt-4
      text-5xl
      sm:text-6xl
      md:text-7xl
      font-black
      tracking-[0.15em]
      "
    >
      LA RIVALITÉ
    </h1>

    <p
      className="
      text-center
      mt-4
      text-zinc-500
      uppercase
      max-w-lg
      mx-auto
      tracking-[0.4em]
      "
    >
      Mavericks vs Spartans
    </p>

  </div>

</section>
  );
}