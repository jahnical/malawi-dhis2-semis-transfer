import { useState } from 'react'
import { useRecoilState } from 'recoil'
import { useDataEngine } from '@dhis2/app-runtime'
import { useGetEventsByEnrollment } from '../events/useGetEventsByEnrollment'
import { TableDataRefetch } from 'dhis2-semis-types'
import { useTransferConst } from '../transferOptions/statusOptions'
import { useGetEvents, useShowAlerts, useTrackerApiVersion, useUploadEvents } from 'dhis2-semis-functions'
import { transferApprovalPayload } from '../../utils/tei/transferApprovalPayload'
import useGetSelectedKeys from '../config/useGetSelectedKeys'

const ENROLLMENT_EVENT_FIELDS = 'event,programStage,orgUnit,occurredAt,scheduledAt,status,enrollment,trackedEntity,program,dataValues[dataElement,value]'

// 40 takes trackedEntityInstance + ou, 41 trackedEntity + ou, 42+ trackedEntity + orgUnit (43 dropped ou)
const TRANSFERQUERY: any = {
    resource: 'tracker/ownership/transfer',
    type: 'update',
    params: ({ program, ou, trackedEntityInstance, apiVersion }: any) => ({
        program: program,
        [apiVersion < 42 ? 'ou' : 'orgUnit']: ou,
        [apiVersion < 41 ? 'trackedEntityInstance' : 'trackedEntity']: trackedEntityInstance
    })
}

export function useTransferTEI({ selectedTei, handleCloseApproval }: { selectedTei: any, handleCloseApproval: () => void }) {
    const engine = useDataEngine()
    const apiVersion = useTrackerApiVersion()
    const { show, hide } = useShowAlerts()
    const { dataStoreData } = useGetSelectedKeys()
    const [loading, setloading] = useState(false)
    const [refetch, setRefetch] = useRecoilState<boolean>(TableDataRefetch)
    const { transferConst } = useTransferConst({ dataStore: dataStoreData })
    const { uploadValues } = useUploadEvents()
    const { getEventsByEnrollment, loading: loadingEvents } = useGetEventsByEnrollment()
    const { getEvents } = useGetEvents()

    const transferTEI = async (ou: any) => {
        setloading(true)
        // Every event of the enrollment, whatever its stage
        const events: any[] = await getEvents({
            program: selectedTei?.programId ?? dataStoreData?.program,
            enrollments: selectedTei?.enrollmentId,
            orgUnitMode: 'ACCESSIBLE',
            fields: ENROLLMENT_EVENT_FIELDS,
            paging: false,
        } as any) ?? []
        const registrationEvent: any = events.find((x: any) => x?.programStage == dataStoreData.registration.programStage)

        if (!registrationEvent) {
            show({ message: `Registration event is missing in this enrollment.`, type: { critical: true } })
            setTimeout(hide, 5000);
            setloading(false)
            handleCloseApproval();
        }

        else {
            let payload: { events: any[] }
            try {
                // Built before the ownership transfer so a missing transfer event stops the approval
                payload = transferApprovalPayload({
                    events,
                    transfer: dataStoreData.transfer as any,
                    registrationStage: dataStoreData.registration.programStage,
                    destinationSchool: ou,
                })
            } catch (error: any) {
                show({ message: error?.message, type: { critical: true } })
                setTimeout(hide, 5000);
                setloading(false)
                handleCloseApproval();
                return
            }

            await engine.mutate(TRANSFERQUERY, {
                variables: {
                    program: selectedTei?.programId ?? dataStoreData?.program,
                    ou,
                    trackedEntityInstance: selectedTei?.trackedEntity,
                    apiVersion
                }
            })
                .then(async () => {
                    // Events only: the enrollment's status, dates and org unit stay as they are
                    await uploadValues(payload, 'COMMIT', 'UPDATE').then(() => {
                        setloading(false)
                        handleCloseApproval(); setRefetch(!refetch)
                    })
                })
                .catch(e => {
                    setloading(false)
                }).finally(() =>
                    setloading(false)
                )
        }
    }

    const rejectTEI = async () => {
        setloading(true)
        const events = await getEventsByEnrollment(selectedTei?.enrollmentId, selectedTei?.trackedEntity, [dataStoreData.transfer.programStage])
        const transferStatus = dataStoreData?.transfer?.statusOptions?.find((x: any) => x.configKey === "reprovedCode")?.code

        const updatedEvent = [{
            ...events?.[0],
            dataValues: [...events?.[0]?.dataValues?.filter((x: any) => x?.dataElement != dataStoreData?.transfer?.status),
            {
                dataElement: dataStoreData?.transfer?.status,
                value: transferStatus
            }]
        }]

        await uploadValues({ events: updatedEvent }, 'COMMIT', 'CREATE_AND_UPDATE').then(() => {
            setloading(false)
            handleCloseApproval(); setRefetch(!refetch)
        })

        setloading(false)
    }

    return {
        loading: loading,
        loadingEvents,
        transferTEI,
        rejectTEI
    }
}
