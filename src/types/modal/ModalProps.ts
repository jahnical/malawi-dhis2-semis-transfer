import { D2I18n } from "dhis2-semis-types"

interface ApproveTranferProps {
    setModalDetails: (value: any) => void
    modalDetails: any,
    i18n: D2I18n
    onAfterAction?: () => void
}

export type { ApproveTranferProps }