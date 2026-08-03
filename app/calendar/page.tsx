import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CalendarView from "@/components/CalendarView";
import "../styles/calendar.css";

export const metadata = { title: "Calendar - Kiowa Gun Club" };

export default function CalendarPage() {
  return (
    <>
      <Header active="calendar" />
      <main className="container" id="main">
        <section id="calendar" className="content-section">
          <h2>Calendar</h2>
          <CalendarView />
        </section>
      </main>
      <Footer />
    </>
  );
}
