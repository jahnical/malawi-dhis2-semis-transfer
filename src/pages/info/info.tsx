import { InfoPage } from "dhis2-semis-components";
import { D2I18n } from "dhis2-semis-types";
import { useUrlParams, getInfoInstructions } from "dhis2-semis-functions";

export default function InfoPageComp({ i18n }: { i18n: D2I18n }) {

    const { urlParameters: { sectionType } } = useUrlParams();
    return (
        <InfoPage
            title={sectionType === "staff" ? i18n.t("SEMIS-Staff-Transfer") : i18n.t("SEMIS-Learner-Transfer")}
            sections={[
                {
                    sectionTitle: i18n.t("Follow the instructions to proceed:"),
                    instructions: getInfoInstructions({ i18n }),
                },
            ]}
        />
    )
}