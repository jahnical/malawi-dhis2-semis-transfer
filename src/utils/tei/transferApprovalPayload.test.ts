import { transferApprovalPayload } from "./transferApprovalPayload";

const transfer = {
    programStage: "TRANSFER", status: "ST", destinySchool: "DEST",
    statusOptions: [{ code: "Pending", configKey: "penddingCode" }, { code: "Approved", configKey: "approvedCode" }, { code: "Rejected", configKey: "reprovedCode" }],
}

test("only the registration and empty events move; the pending transfer is approved", () => {
    const events = [
        { event: "R1", programStage: "REG", orgUnit: "S1", dataValues: [{ dataElement: "AY", value: "2025/2026" }] },
        { event: "A1", programStage: "ATT", orgUnit: "S1", dataValues: [{ dataElement: "status", value: "present" }] },
        { event: "M1", programStage: "TERM1", orgUnit: "S1", dataValues: [{ dataElement: "math", value: "70" }] },
        { event: "M2", programStage: "TERM2", orgUnit: "S1", dataValues: [] },
        { event: "OLD", programStage: "TRANSFER", orgUnit: "S1", dataValues: [{ dataElement: "ST", value: "Rejected" }] },
        { event: "TR", programStage: "TRANSFER", orgUnit: "S1", dataValues: [{ dataElement: "ST", value: "Pending" }] },
    ]
    const { events: out } = transferApprovalPayload({ events, transfer, registrationStage: "REG", destinationSchool: "S2" })
    expect(out.map((e) => [e.event, e.orgUnit])).toEqual([["R1", "S2"], ["M2", "S2"], ["TR", "S1"]])
    expect(out[2].dataValues).toEqual([{ dataElement: "ST", value: "Approved" }, { dataElement: "DEST", value: "S2" }])
    expect(Object.keys(transferApprovalPayload({ events, transfer, registrationStage: "REG", destinationSchool: "S2" }))).toEqual(["events"])
})

test("a missing transfer event stops the approval", () => {
    expect(() => transferApprovalPayload({ events: [{ event: "R1", programStage: "REG" }], transfer, registrationStage: "REG", destinationSchool: "S2" }))
        .toThrow("Transfer event is missing")
})
