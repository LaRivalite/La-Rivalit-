import Hero from "../components/Hero";
import LiveMatchBar from "../components/LiveMatchBar";
import RivalrySnapshot from "../components/RivalrySnapshot";
import TrophyCard from "../components/TrophyCard";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Hero />

      <div className="mt-12 px-5 lg:px-20">
        <LiveMatchBar />
      </div>

      <RivalrySnapshot />

      <section
        className="
        mt-20
        mb-12

        px-5
        lg:px-20

        grid
        grid-cols-1
        md:grid-cols-2

        gap-8
        "
      >
        <TrophyCard type="silver" />
        <TrophyCard type="gold" />
      </section>

      <div className="flex justify-center mt-12">
  <Link
    to="/scorer"
    className="px-6 py-3 rounded-md border
      border-white/10
      bg-white/[0.03]
      backdrop-blur-xl text-white transition-all
      duration-300
      hover:border-white/20
      hover:bg-white/[0.05]"
  >
    Start a Match
  </Link>
</div>

      <Footer />
    </>
  );
}