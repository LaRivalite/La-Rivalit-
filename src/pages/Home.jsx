import Hero from "../components/Hero";
import LiveMatchBar from "../components/LiveMatchBar";
import RivalrySnapshot from "../components/RivalrySnapshot";
import TrophyCard from "../components/TrophyCard";
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

      <Footer />
    </>
  );
}