import { buildTransferApprovalEvents } from "dhis2-semis-functions";

/**
 * Events payload sent after the ownership transfer succeeds. The registration event and empty
 * placeholder events move to the receiving school; events with data stay where they were captured;
 * the transfer event gets the approved status (and the destination, when it had none).
 * The enrollment is not part of the payload, so its status, dates and org unit do not change.
 */
export function transferApprovalPayload({ events, transfer, registrationStage, destinationSchool }: {
    // Every event of the enrollment
    events: any[]
    // The section's transfer configuration (semis/values > transfer)
    transfer: { programStage: string, status: string, destinySchool?: string, statusOptions?: { code: string, configKey?: string }[] }
    registrationStage: string
    destinationSchool: string
}) {
    const statusCode = (configKey: string) => transfer?.statusOptions?.find((x) => x?.configKey === configKey)?.code
    const transferEvents = events.filter((event) => event?.programStage === transfer.programStage && !event?.deleted)
    // The pending request is the one being approved; older (rejected) requests are left alone
    const transferEvent = transferEvents.find((event) =>
        event?.dataValues?.some((dv: any) => dv.dataElement === transfer.status && dv.value === statusCode("penddingCode"))) ?? transferEvents[0]
    if (!transferEvent) throw new Error("Transfer event is missing in this enrollment.")

    return {
        events: buildTransferApprovalEvents({
            events,
            registrationStage,
            transferStage: transfer.programStage,
            transferEventId: transferEvent.event,
            destinationSchool,
            statusDataElement: transfer.status,
            approvedCode: statusCode("approvedCode") as string,
            destinationDataElement: transfer.destinySchool,
        }),
    }
}
