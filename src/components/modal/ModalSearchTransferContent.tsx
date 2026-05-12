import { useState, useMemo } from 'react'
import { Form } from 'react-final-form'
import { Button, ButtonStrip, NoticeBox, IconThumbUp24, IconThumbDown24 } from '@dhis2/ui'
import { Collapse, IconButton } from '@mui/material'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { ModalComponent, WithBorder, WithPadding, CustomForm, Table } from 'dhis2-semis-components'
import { useUrlParams, useGetSectionTypeLabel } from 'dhis2-semis-functions'
import { D2I18n, ProgramConfig, GroupFormProps } from 'dhis2-semis-types'
import ApproveTranfer from './modalTransfer'
import useGetSelectedKeys from '../../hooks/config/useGetSelectedKeys'
import useSearchTransferEnrollments from '../../hooks/tei/useSearchTransferEnrollments'
import styles from './modalSearchTransfer.module.css'

interface ModalSearchTransferContentProps {
    open: boolean
    setOpen: (value: boolean) => void
    i18n: D2I18n
}

function buildGroupedSearchFields(programConfig: ProgramConfig | undefined) {
    if (!programConfig?.programTrackedEntityAttributes) return []
    const attrs = programConfig.programTrackedEntityAttributes
        .filter((a: any) => a.searchable || a.trackedEntityAttribute?.unique)
        .map((a: any) => ({
            id: a.trackedEntityAttribute.id,
            name: a.trackedEntityAttribute.id,
            displayName: a.trackedEntityAttribute.displayName,
            labelName: a.trackedEntityAttribute.displayName,
            header: a.trackedEntityAttribute.displayName,
            unique: a.trackedEntityAttribute.unique,
            searchable: a.searchable,
            valueType: a.trackedEntityAttribute.optionSet
                ? 'LIST'
                : a.trackedEntityAttribute.valueType,
            options: { optionSet: a.trackedEntityAttribute.optionSet },
            initialOptions: { optionSet: a.trackedEntityAttribute.optionSet },
            visible: true,
            required: false,
            disabled: false,
            error: false,
            warning: false,
        }))
    const uniqueGroups: { name: string; id: string; variables: any[] }[] = []
    attrs.filter((a: any) => a.unique).forEach((a: any) => {
        const existing = uniqueGroups.find((g) => g.name === a.displayName)
        if (existing) existing.variables.push(a)
        else uniqueGroups.push({ name: a.displayName, id: a.id, variables: [a] })
    })
    const nonUnique = attrs.filter((a: any) => !a.unique)
    if (nonUnique.length > 0) {
        uniqueGroups.push({ name: 'attributes', id: 'attributes', variables: nonUnique })
    }
    return uniqueGroups
}

function buildSearchableColumns(programConfig: ProgramConfig | undefined) {
    if (!programConfig?.programTrackedEntityAttributes) return []
    return programConfig.programTrackedEntityAttributes
        .filter((a: any) => a.searchable || a.trackedEntityAttribute?.unique)
        .map((a: any) => ({
            id: a.trackedEntityAttribute.id,
            name: a.trackedEntityAttribute.id,
            displayName: a.trackedEntityAttribute.displayName,
            header: a.trackedEntityAttribute.displayName,
            valueType: a.trackedEntityAttribute.valueType,
            visible: true,
            required: false,
            disabled: false,
        }))
}

function toFormFields(variables: any[]): GroupFormProps[] {
    return [{ storyBook: false, name: '', description: '', fields: variables }]
}

function buildQuery(
    searchGroups: { variables: any[] }[],
    collapseIndex: number,
    queryForm: Record<string, string>
): string {
    const openGroupVars = searchGroups[collapseIndex]?.variables ?? []
    const openGroupIds = openGroupVars.map((v: any) => v.id)
    const filtered: Record<string, string> = {}
    Object.keys(queryForm).forEach((key) => {
        if (openGroupIds.includes(key)) filtered[key] = queryForm[key]
    })
    return Object.entries(filtered)
        .filter(([k, v]) => k && v)
        .map(([k, v]) => `${k}:LIKE:${v},`)
        .join('')
}

function ModalSearchTransferContent({ open, setOpen, i18n }: ModalSearchTransferContentProps) {
    const { dataStoreData, program: programConfig } = useGetSelectedKeys()
    const { sectionName } = useGetSectionTypeLabel()
    const { urlParameters } = useUrlParams()
    const { school: orgUnit } = urlParameters

    const searchGroups = useMemo(
        () => buildGroupedSearchFields(programConfig as unknown as ProgramConfig),
        [programConfig]
    )
    const searchableColumns = useMemo(
        () => buildSearchableColumns(programConfig as unknown as ProgramConfig),
        [programConfig]
    )

    const { transferValues, setTransferValues, loading, getTransferData } =
        useSearchTransferEnrollments({
            program: dataStoreData?.program ?? '',
            transfer: dataStoreData?.transfer,
            school: orgUnit ?? '',
        })

    const [showResults, setShowResults] = useState(false)
    const [collapseAttributes, setCollapseAttributes] = useState(0)
    const [queryForm, setQueryForm] = useState<Record<string, string>>({})
    const [approvalDetails, setApprovalDetails] = useState<any>({})

    const onHandleChange = (e: { value: string; name: string }) => {
        if (!e.value) {
            const updated = { ...queryForm }
            delete updated[e.name]
            setQueryForm(updated)
        } else {
            setQueryForm((prev) => ({ ...prev, [e.name]: e.value }))
        }
    }

    const onHandleSubmit = async () => {
        const filters = buildQuery(searchGroups, collapseAttributes, queryForm)
        if (filters.length > 0) {
            await getTransferData({ filters, setShowResults })
        }
    }

    const onReset = () => {
        setQueryForm({})
        setTransferValues([])
        setShowResults(false)
    }

    const handleCloseApproval = () => {
        setApprovalDetails({})
        setOpen(false)
    }

    const rowsActions = [
        {
            label: i18n.t('Approve'),
            color: '#4caf50',
            loading: false,
            disabled: false,
            icon: <IconThumbUp24 />,
            onClick: ({ row }: { row: any }) => {
                setApprovalDetails({ open: true, approved: true, row })
            },
        },
        {
            label: i18n.t('Reject'),
            color: '#f44336',
            loading: false,
            disabled: false,
            icon: <IconThumbDown24 />,
            onClick: ({ row }: { row: any }) => {
                setApprovalDetails({ open: true, approved: false, row })
            },
        },
    ]

    const modalActions = [
        {
            id: 'cancel',
            small: true,
            name: i18n.t('Close'),
            disabled: false,
            primary: true,
            onClick: () => setOpen(false),
        },
    ]

    return (
        <>
            <ModalComponent
                title={i18n.t('Fill in at least 1 attribute to search.')}
                actions={modalActions}
                handleClose={() => setOpen(false)}
                open={open}
                size="large"
                isClickAway={false}
                showActions={showResults}
                children={
                    <div>
                        {searchGroups.map((group, index) => (
                            <div className="mb-3" key={index}>
                                <WithBorder type="all">
                                    <div
                                        className={styles.accordionHeaderContainer}
                                        onClick={() =>
                                            setCollapseAttributes(
                                                index === collapseAttributes ? -1 : index
                                            )
                                        }
                                    >
                                        <label className={styles.accordionHeader}>
                                            {i18n.t('Search by')} {group.name}
                                        </label>
                                        <IconButton
                                            size="small"
                                            onClick={() => setCollapseAttributes(index)}
                                        >
                                            {collapseAttributes === index ? (
                                                <ExpandLess />
                                            ) : (
                                                <ExpandMore />
                                            )}
                                        </IconButton>
                                    </div>
                                    <Collapse in={collapseAttributes === index}>
                                        <WithBorder type="top">
                                            <WithPadding>
                                                <CustomForm
                                                    formFields={toFormFields(group.variables)}
                                                    initialValues={{ orgUnit }}
                                                    onFormSubtmit={() => onHandleSubmit()}
                                                    onInputChange={(e: any) => onHandleChange(e)}
                                                    onCancel={onReset}
                                                    submitButtonLabel={i18n.t('Search')}
                                                    Form={Form}
                                                    withButtons={true}
                                                    loading={loading}
                                                    storyBook={false}
                                                />
                                            </WithPadding>
                                        </WithBorder>
                                    </Collapse>
                                </WithBorder>
                            </div>
                        ))}

                        <Collapse in={showResults}>
                            <>
                                {transferValues?.length ? (
                                    <Table
                                        columns={searchableColumns}
                                        programConfig={programConfig}
                                        tableData={transferValues}
                                        title={i18n.t('Pending incoming transfers')}
                                        rowAction={rowsActions}
                                        displayType="icon"
                                        showRowActions
                                        paginate={false}
                                        showHeaderFilters={false}
                                        showRowIndex={false}
                                    />
                                ) : (
                                    <NoticeBox title={i18n.t('No pending incoming transfers found')}>
                                        {i18n.t(
                                            'No students with a pending incoming transfer match your search.'
                                        )}
                                    </NoticeBox>
                                )}
                            </>
                        </Collapse>

                        {!showResults && (
                            <ButtonStrip end>
                                <Button onClick={() => setOpen(false)} loading={false}>
                                    {i18n.t('Close')}
                                </Button>
                            </ButtonStrip>
                        )}
                    </div>
                }
            />

            {approvalDetails?.open && (
                <ApproveTranfer
                    i18n={i18n}
                    modalDetails={approvalDetails}
                    setModalDetails={setApprovalDetails}
                    onAfterAction={handleCloseApproval}
                />
            )}
        </>
    )
}

export default ModalSearchTransferContent
