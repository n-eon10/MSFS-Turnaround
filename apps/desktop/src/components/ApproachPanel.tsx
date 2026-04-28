export function ApproachPanel() {
  return (
    <div className="p-6">
      <div className="mb-5 border-b-2 border-[#8a857d] pb-4">
        <p className="mb-2 text-[13px] uppercase tracking-[0.18em] text-[#555]">
          Module 02
        </p>
        <h1 className="m-0 text-[44px] font-bold leading-none text-[#173955]">
          Approach Setup
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <section className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#f7f2e9] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
          <h2 className="mb-4 text-[22px] font-bold">Runway & Approach</h2>

          <div className="grid gap-4">
            <label className="grid gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#555]">
              Airport ICAO
              <input
                className="rounded-[4px] border-2 border-[#2c2c2c] bg-white px-3 py-2 text-[18px] normal-case text-[#171717]"
                placeholder="EGLL"
              />
            </label>

            <label className="grid gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#555]">
              Runway
              <input
                className="rounded-[4px] border-2 border-[#2c2c2c] bg-white px-3 py-2 text-[18px] normal-case text-[#171717]"
                placeholder="27L"
              />
            </label>

            <label className="grid gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#555]">
              Approach Type
              <select className="rounded-[4px] border-2 border-[#2c2c2c] bg-white px-3 py-2 text-[18px] normal-case text-[#171717]">
                <option>ILS</option>
                <option>RNAV</option>
                <option>Visual</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#efe6b8] p-5 shadow-[3px_3px_0_0_#b8b3aa]">
          <h2 className="mb-4 text-[22px] font-bold">Landing Config</h2>

          <div className="space-y-3 text-[18px]">
            <div>□ Gear down</div>
            <div>□ Landing flaps set</div>
            <div>□ Speed stable</div>
            <div>□ Localiser / course captured</div>
            <div>□ Glidepath stable</div>
          </div>
        </section>
      </div>
    </div>
  );
}