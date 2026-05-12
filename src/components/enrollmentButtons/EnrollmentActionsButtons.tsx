import React, { useState } from 'react'
import { Tooltip } from '@mui/material';
import TabComponent from '../tabs/TabComponent';
import { IconAddCircle24, IconSearch24, Button } from "@dhis2/ui";
import { useUrlParams } from 'dhis2-semis-functions';
import styles from './enrollmentActionsButtons.module.css'
import { useLocation, useNavigate } from 'react-router-dom';
import { D2I18n } from 'dhis2-semis-types';
import { TabPosistion } from '../../types/tabs/TabsTypes';
import ModalSearchTransferContent from '../modal/ModalSearchTransferContent';

function EnrollmentActionsButtons({ i18n }: { i18n: D2I18n }) {
    const { search } = useLocation()
    const navigate = useNavigate()
    const { urlParameters } = useUrlParams();
    const { school: orgUnit, position } = urlParameters;
    const [openSearchTransfer, setOpenSearchTransfer] = useState(false)

    return (
        <div className={styles.container}>
            <TabComponent i18n={i18n} />
            {position === TabPosistion.INCOMING && (
                <Tooltip title={orgUnit === null ? i18n.t("Please select an organisation unit before") : ""} >
                    <Button
                        onClick={() => setOpenSearchTransfer(true)}
                        className={styles.btn}
                        disabled={!Boolean(orgUnit)}
                        icon={<IconSearch24 />}
                    >
                        <span className={styles.work_buttons_text}>{i18n.t("Search transfer")}</span>
                    </Button>
                </Tooltip>
            )}
            <Tooltip title={orgUnit === null ? i18n.t("Please select an organisation unit before") : ""} >
                <Button
                    onClick={() => navigate(`/semis/transfer-execute${search}`)}
                    className={styles.btn}
                    disabled={!Boolean(orgUnit)}
                    icon={<IconAddCircle24 />}
                >
                    <span className={styles.work_buttons_text}>{i18n.t("Perform transfer")}</span>
                </Button>
            </Tooltip>
            {openSearchTransfer && (
                <ModalSearchTransferContent
                    open={openSearchTransfer}
                    setOpen={setOpenSearchTransfer}
                    i18n={i18n}
                />
            )}
        </div>
    )
}

export default EnrollmentActionsButtons