import { useState } from 'react'
import { useRecoilState } from 'recoil'
import { useDataEngine } from '@dhis2/app-runtime'
import { useGetEventsByEnrollment } from '../events/useGetEventsByEnrollment'
import { TableDataRefetch } from 'dhis2-semis-types'
import { useTransferConst } from '../transferOptions/statusOptions'
import { useShowAlerts, useUploadEvents } from 'dhis2-semis-functions'
import { formatEnrollmentBody } from '../../utils/tei/enrollmentBody'
import useGetUsedProgramStages from '../programStages/useGetUsedPProgramStages'
import useGetSelectedKeys from '../config/useGetSelectedKeys'

const TRANSFERQUERY: any = {
    resource: 'tracker/ownership/transfer',
    type: 'update',
    params: ({ program, ou, trackedEntityInstance }: any) => ({
        program,
        ou: ou,
        trackedEntityInstance: trackedEntityInstance
    })
}

export function useTransferTEI({ selectedTei, handleCloseApproval }: { selectedTei: any, handleCloseApproval: () => void }) {
    const engine = useDataEngine()
    const { show, hide } = useShowAlerts()
    const { dataStoreData, program: programData } = useGetSelectedKeys()
    const [loading, setloading] = useState(false)
    const [refetch, setRefetch] = useRecoilState<boolean>(TableDataRefetch)
    const { transferConst } = useTransferConst({ dataStore: dataStoreData })
    const { uploadValues } = useUploadEvents()
    const { getEventsByEnrollment, loading: loadingEvents } = useGetEventsByEnrollment()
    const programStagesToTransfer = useGetUsedProgramStages()

    const transferTEI = async (ou: any) => {
        setloading(true)
        const events = await getEventsByEnrollment(selectedTei?.enrollmentId, selectedTei?.trackedEntity, programStagesToTransfer)
        const registrationEvent: any = events?.filter((x: any) => x?.programStage == dataStoreData.registration.programStage)[0] ?? {}
        const index: any = events?.findIndex((x: any) => x?.programStage == dataStoreData.transfer.programStage)
        let transferEvent: any = events?.splice(index, 1)[0]

        // If the student had no destination school, set it to the approving school
        if (selectedTei?._needsDestination && dataStoreData?.transfer?.destinySchool) {
            transferEvent = {
                ...transferEvent,
                dataValues: [
                    ...((transferEvent?.dataValues ?? []).filter((x: any) => x?.dataElement !== dataStoreData.transfer.destinySchool)),
                    { dataElement: dataStoreData.transfer.destinySchool, value: ou }
                ]
            }
        }

        if (Object.keys(registrationEvent).length === 0) {
            show({ message: `Registration event is missing in this enrollment.`, type: { critical: true } })
            setTimeout(hide, 5000);
            handleCloseApproval();
        }

        else {
            await engine.mutate(TRANSFERQUERY, {
                variables: {
                    program: selectedTei?.programId,
                    ou,
                    trackedEntityInstance: selectedTei?.trackedEntity
                }
            })
                .then(async () => {
                    const transferStatus = dataStoreData.transfer?.statusOptions?.find((x: any) => x.configKey === "approvedCode")?.code

                    const trackedEntities = formatEnrollmentBody(programData,
                        events!,
                        registrationEvent,
                        ou,
                        transferEvent,
                        { ...selectedTei, trackedEntityType: dataStoreData.trackedEntityType },
                        transferStatus,
                        dataStoreData?.transfer?.status
                    )
                    await uploadValues({ trackedEntities: trackedEntities }, 'COMMIT', 'CREATE_AND_UPDATE').then(() => {
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
