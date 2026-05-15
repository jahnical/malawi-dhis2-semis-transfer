export function formatEnrollmentBody(program: any, events: any[], registrationEvent: any, newOu: any, transferEvent: any, tei: any, value: any, status: string) {
    let attributes = []

    for (const att of program?.programTrackedEntityAttributes) {
        if (tei?.[att?.trackedEntityAttribute?.id]) attributes.push({
            attribute: att?.trackedEntityAttribute?.id,
            value: tei?.[att?.trackedEntityAttribute?.id]
        })
    }

    const trackedEntities = [
        {
            orgUnit: newOu,
            program: program?.id,
            trackedEntity: tei?.trackedEntity,
            enrollment: registrationEvent?.enrollment,
            trackedEntityType: tei?.trackedEntityType,
            enrollments: [
                {
                    orgUnit: registrationEvent?.orgUnit,
                    program: program?.id,
                    status: "COMPLETED",
                    enrollment: registrationEvent?.enrollment,
                    attributes: attributes,
                    createdAt: registrationEvent?.createdAt,
                    occurredAt: registrationEvent?.occurredAt,
                    enrolledAt: registrationEvent?.occurredAt,
                    events: [
                        ...events?.filter(x => x != undefined)?.map((event: any) => ({
                            ...event,
                            orgUnit: event?.orgUnit,
                        })),
                        {
                            ...transferEvent,
                            dataValues: [
                                ...transferEvent?.dataValues?.filter((x: any) => x?.dataElement != status),
                                { dataElement: status, value }
                            ]
                        }
                    ]
                }
            ]
        }
    ]

    return trackedEntities;
}