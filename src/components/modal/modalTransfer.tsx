import React from "react";
import style from './modalTransfer.module.css'
import { ModalComponent, WithPadding } from "dhis2-semis-components";
import { ApproveTranferProps } from "../../types/modal/ModalProps";
import { useGetSectionTypeLabel, useUrlParams } from "dhis2-semis-functions";
import { useTransferTEI } from "../../hooks/tei/useTransfer";
import useGetSelectedKeys from "../../hooks/config/useGetSelectedKeys";

function ApproveTranfer(props: ApproveTranferProps): React.ReactElement {
    const { modalDetails, setModalDetails, i18n, onAfterAction } = props;
    const { urlParameters } = useUrlParams()
    const { school, schoolName } = urlParameters
    const { sectionName } = useGetSectionTypeLabel();
    const { program, dataStoreData } = useGetSelectedKeys()
    const trackedEntityAttributes = program!?.trackedEntityType?.trackedEntityTypeAttributes
    const programTrackedEntityAttributes = program!?.programTrackedEntityAttributes
    const handleCloseApproval = () => { setModalDetails({ open: false }); onAfterAction?.(); };
    const { loading, transferTEI, rejectTEI, loadingEvents } = useTransferTEI({ selectedTei: modalDetails.row, handleCloseApproval });

    const actions = [
        { id: "cancel", name: i18n.t("Cancel"), disabled: false, onClick: () => setModalDetails({ open: false }) },
        {
            id: "confirm", name: i18n.t("Confirm"), primary: true, loading: !!(loadingEvents || loading), disabled: !!(loadingEvents || loading), onClick: () => {
                if (modalDetails?.approved) {
                    transferTEI(school)
                } else {
                    rejectTEI()
                }
            }
        },
    ];

    return (
        <ModalComponent
            children={
                <WithPadding p="10px 0px">
                    {modalDetails?.approved
                        ? <span>
                            <span className="text-danger">
                                {i18n.t("Attention")}:
                            </span>
                            {
                                i18n.t('This action will transfer this {{section}} into this school.', {
                                    section: `${i18n.t(sectionName)}s`,
                                })
                            }
                        </span>
                        : <span>
                            <span className="text-danger">
                                {i18n.t("Attention")}:
                            </span>
                            {
                                i18n.t('You are about to reject the {{section}} transfer to this school.', {
                                    section: `${i18n.t(sectionName)}s`,
                                })
                            }
                        </span>
                    }

                    <div className={style.divider}></div>

                    {modalDetails?.approved
                        ? <div className="py-2">
                            {i18n.t("Are you sure you want to approve the transfer of ")} <strong>{modalDetails?.row?.[trackedEntityAttributes[1]?.trackedEntityAttribute.id ?? programTrackedEntityAttributes[2]?.trackedEntityAttribute.id]} {modalDetails?.row?.[trackedEntityAttributes[0]?.trackedEntityAttribute?.id ?? programTrackedEntityAttributes[3]?.trackedEntityAttribute.id]} </strong>{" "} {i18n.t("from")}{" "}
                            <strong>{modalDetails?.row?.[dataStoreData?.transfer?.originSchool]}</strong>{" "} {i18n.t("to")} {" "}
                            <strong>{schoolName}</strong>?
                        </div>
                        : <div className="py-2">
                            {i18n.t("Are you sure you want to reject the transfer of")}  <strong>{modalDetails?.row?.[trackedEntityAttributes[1]?.trackedEntityAttribute.id ?? programTrackedEntityAttributes[2]?.trackedEntityAttribute.id]} {modalDetails?.row?.[trackedEntityAttributes[0]?.trackedEntityAttribute?.id ?? programTrackedEntityAttributes[3]?.trackedEntityAttribute.id]}</strong>{" "} {i18n.t("from")}{" "}
                            <strong>{modalDetails?.row?.[dataStoreData?.transfer?.originSchool]}</strong>{" "} {i18n.t("to")} {" "}
                            <strong>{schoolName}</strong>
                        </div>
                    }
                </WithPadding>
            }
            open={modalDetails.open}
            handleClose={() => setModalDetails({ open: false })}
            title={i18n.t("Transfer Approval")}
            showActions
            size="large"
            actions={actions}
        />
    );
}

export default ApproveTranfer;
