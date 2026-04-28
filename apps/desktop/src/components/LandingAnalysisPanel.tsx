export function LandingAnalysisPanel() {
  return (
    <div className="p-6">
      <div className="mb-5 border-b-2 border-[#8a857d] pb-4">
        <p className="mb-2 text-[13px] uppercase tracking-[0.18em] text-[#555]">
          Module 03
        </p>
        <h1 className="m-0 text-[44px] font-bold leading-none text-[#173955]">
          Landing Analysis
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <section className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#f1d4cf] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
          <div className="mb-3 text-[13px] uppercase tracking-[0.16em] text-[#555]">
            Touchdown V/S
          </div>
          <div className="text-[42px] font-bold">--</div>
          <div className="text-[14px] uppercase tracking-[0.12em] text-[#555]">
            FPM
          </div>
        </section>

        <section className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#dbe7ef] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
          <div className="mb-3 text-[13px] uppercase tracking-[0.16em] text-[#555]">
            Touchdown Speed
          </div>
          <div className="text-[42px] font-bold">--</div>
          <div className="text-[14px] uppercase tracking-[0.12em] text-[#555]">
            KT
          </div>
        </section>

        <section className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#d7e6d1] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
          <div className="mb-3 text-[13px] uppercase tracking-[0.16em] text-[#555]">
            Landing Score
          </div>
          <div className="text-[42px] font-bold">--</div>
          <div className="text-[14px] uppercase tracking-[0.12em] text-[#555]">
            / 100
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[6px] border-2 border-[#2c2c2c] bg-[#f7f2e9] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
        <h2 className="mb-3 text-[24px] font-bold">Event Log</h2>
        <div className="rounded-[4px] border-2 border-[#2c2c2c] bg-white p-4 text-[16px]">
          Waiting for touchdown event...
        </div>
      </section>
    </div>
  );
}