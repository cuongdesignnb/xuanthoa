import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Courses from "@/components/Courses";
import Experience from "@/components/Experience";
import Social from "@/components/Social";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Courses />
        <Experience />
        <Social />
      </main>
      <Footer />
    </>
  );
}
