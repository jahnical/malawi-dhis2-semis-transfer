import { useState } from 'react'
import { useSearchTei, useGetEvents, attributes, useShowAlerts } from 'dhis2-semis-functions'
import { useGetOusData } from '../orgUnits/useGetOrgUnits'

interface UseSearchTransferEnrollmentsProps {
    program: string
    transfer: any
    school: string
}

export default function useSearchTransferEnrollments({ program, transfer, school }: UseSearchTransferEnrollmentsProps) {
    const { show } = useShowAlerts()
    const { getEvents } = useGetEvents()
    const { getTrackersearch } = useSearchTei()
    const { getOuName } = useGetOusData()
    const [loading, setLoading] = useState(false)
    const [transferValues, setTransferValues] = useState<any[]>([])

    const pendingCode = transfer?.statusOptions?.find((x: any) => x.configKey === 'penddingCode')?.code

    const getTransferData = async ({ filters, setShowResults }: { filters: string; setShowResults: (val: boolean) => void }) => {
        setLoading(true)
        try {
            const teiResponse = await getTrackersearch({ program, filters })
            const instances: any[] = teiResponse?.results?.instances ?? []
            const results: any[] = []

            for (const tei of instances) {
                const transferEvents: any[] = await getEvents({
                    program,
                    programStage: transfer?.programStage,
                    trackedEntities: tei.trackedEntity,
                    fields: 'event,trackedEntity,enrollment,occurredAt,dataValues[dataElement,value],orgUnit'
                }) ?? []

                const programOwners: any[] = tei.programOwners ?? []
                const ownershipOu = programOwners[programOwners.length - 1]?.orgUnit ?? programOwners[0]?.orgUnit

                const pendingEvent = transferEvents?.find((event: any) => {
                    const dvMap: Record<string, string> = {}
                    for (const dv of (event.dataValues ?? [])) dvMap[dv.dataElement] = dv.value
                    if (dvMap[transfer?.status] !== pendingCode) return false
                    const destSchool = dvMap[transfer?.destinySchool]
                    // case 1: transfer explicitly destined for current school
                    if (destSchool === school) return true
                    // case 2: no destination set and not originating from current school
                    if (!destSchool && ownershipOu !== school) return true
                    return false
                })

                if (!pendingEvent) continue

                const dvMap: Record<string, string> = {}
                for (const dv of (pendingEvent.dataValues ?? [])) dvMap[dv.dataElement] = dv.value
                const needsDestination = !dvMap[transfer?.destinySchool]

                const activeEnrollment = tei.enrollments?.find((e: any) => e.status === 'ACTIVE')

                let originSchoolName = ownershipOu
                if (ownershipOu) {
                    try {
                        const ouData = await getOuName(ownershipOu)
                        originSchoolName = ouData?.results?.name ?? ownershipOu
                    } catch {
                        // keep ownershipOu as fallback
                    }
                }

                results.push({
                    trackedEntity: tei.trackedEntity,
                    enrollmentId: pendingEvent.enrollment,
                    programId: activeEnrollment?.program,
                    ownershipOu,
                    _needsDestination: needsDestination,
                    [transfer?.originSchool]: originSchoolName,
                    ...attributes(tei.attributes ?? []),
                })
            }

            setTransferValues(results)
            setShowResults(true)
        } catch (error: any) {
            show({ message: `Could not search transfers: ${error?.message}`, type: { critical: true } })
        } finally {
            setLoading(false)
        }
    }

    return { transferValues, setTransferValues, loading, getTransferData }
}
