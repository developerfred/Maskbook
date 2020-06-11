import React, { useState, useEffect } from 'react'
import {
    makeStyles,
    createStyles,
    Theme,
    DialogTitle,
    IconButton,
    Typography,
    Button,
    DialogContent,
    Divider,
    TextField,
    Link,
    DialogActions,
} from '@material-ui/core'
import { useI18N } from '../../utils/i18n-next-ui'
import ShadowRootDialog from '../../utils/jss/ShadowRootDialog'
import { DialogDismissIconUI } from '../../components/InjectedComponents/DialogDismissIcon'
import { TokenSelect } from '../shared/TokenSelect'
import { WalletSelect } from '../shared/WalletSelect'
import { useSelectWallet } from '../shared/useWallet'
import { WalletRecord, ERC20TokenRecord, EthereumTokenType } from '../Wallet/database/types'
import { useStylesExtends } from '../../components/custom-ui-helper'
import { getActivatedUI } from '../../social-network/ui'
import {
    useTwitterDialog,
    useTwitterButton,
    useTwitterCloseButton,
} from '../../social-network-provider/twitter.com/utils/theme'
import { useCapturedInput } from '../../utils/hooks/useCapturedEvents'
import BigNumber from 'bignumber.js'
import { formatBalance } from '../Wallet/formatter'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        form: { '& > *': { margin: theme.spacing(1, 0) } },
        title: {
            marginLeft: 6,
        },
        helperText: {
            marginLeft: theme.spacing(4),
            marginTop: theme.spacing(-1.5),
        },
        nativeInput: {
            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                '-webkit-appearance': 'none',
                margin: 0,
            },
            '-moz-appearance': 'textfield',
        },
    }),
)

interface DonateDialogUIProps
    extends withClasses<
        | KeysInferFromUseStyles<typeof useStyles>
        | 'root'
        | 'dialog'
        | 'backdrop'
        | 'container'
        | 'paper'
        | 'header'
        | 'content'
        | 'actions'
        | 'close'
        | 'button'
    > {
    title: string
    description: string
    onDonate(opt: { amount: number; address: string; token: ERC20TokenRecord; tokenType: EthereumTokenType }): void
    open: boolean
    onClose(): void
    onRequireNewWallet: () => void
    wallets: WalletRecord[] | 'loading'
    tokens: ERC20TokenRecord[]
    address?: string
}

function DonateDialogUI(props: DonateDialogUIProps) {
    const { t } = useI18N()
    const classes = useStylesExtends(useStyles(), props)
    // const [amount, setAmount] = useState(0)
    const useSelectWalletResult = useSelectWallet(props.wallets, props.tokens, props.onRequireNewWallet)
    const {
        erc20Balance,
        ethBalance,
        selectedToken,
        selectedTokenType,
        selectedTokenAddress,
        selectedWallet,
        selectedWalletAddress,
    } = useSelectWalletResult

    const [amount, setAmount] = useState(0.01)
    const [, amountInputRef] = useCapturedInput((x) => setAmount(parseFloat(x)))
    const amountMaxBigint = selectedWallet
        ? selectedTokenType === EthereumTokenType.ETH
            ? selectedWallet.eth_balance
            : selectedToken?.amount
        : undefined
    const amountMaxNumber = BigNumber.isBigNumber(amountMaxBigint)
        ? selectedTokenType === EthereumTokenType.ETH
            ? formatBalance(amountMaxBigint, 18)
            : selectedToken && formatBalance(amountMaxBigint, selectedToken.decimals)
        : undefined

    const isDisabled = [
        Number.isNaN(amount),
        amount <= 0,
        selectedWallet === undefined,
        amount > (amountMaxNumber || 0),
    ]
    const isButtonDisabled = isDisabled.some((x) => x)

    // set default token
    useEffect(() => useSelectWalletResult.setSelectedTokenType(EthereumTokenType.ETH))
    if (!props.address) return null
    return (
        <div className={classes.root}>
            <ShadowRootDialog
                className={classes.dialog}
                classes={{
                    container: classes.container,
                    paper: classes.paper,
                }}
                open={props.open}
                scroll="body"
                fullWidth
                maxWidth="sm"
                disableAutoFocus
                disableEnforceFocus
                onEscapeKeyDown={props.onClose}
                onExit={props.onClose}
                BackdropProps={{
                    className: classes.backdrop,
                }}>
                <DialogTitle className={classes.header}>
                    <IconButton classes={{ root: classes.close }} onClick={props.onClose}>
                        <DialogDismissIconUI />
                    </IconButton>
                    <Typography className={classes.title} display="inline" variant="inherit">
                        Plugin: Gitcoin Grant
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent className={classes.content}>
                    <Typography variant="h6">{props.title}</Typography>
                    <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                        {props.description}
                    </Typography>
                    <form className={classes.form}>
                        <WalletSelect
                            FormControlProps={{ fullWidth: true }}
                            wallets={props.wallets}
                            useSelectWalletHooks={useSelectWalletResult}></WalletSelect>
                        <TokenSelect
                            FormControlProps={{ fullWidth: true }}
                            useSelectWalletHooks={useSelectWalletResult}></TokenSelect>
                        <TextField
                            InputProps={{ inputRef: amountInputRef }}
                            inputProps={{
                                min: 0,
                                max: amountMaxNumber,
                                className: classes.nativeInput,
                            }}
                            variant="filled"
                            fullWidth
                            defaultValue={amount}
                            type="number"
                            label="Amount"
                        />
                        <Typography variant="body1">
                            By using this service, you'll also be contributing 5% of your contribution to the{' '}
                            <Link
                                target="_blank"
                                rel="noopener noreferrer"
                                href="https://gitcoin.co/grants/86/gitcoin-sustainability-fund">
                                Gitcoin grants round 6+ development fund
                            </Link>
                        </Typography>
                    </form>
                </DialogContent>
                <DialogActions className={classes.actions}>
                    <Typography variant="body2">
                        {selectedWallet
                            ? erc20Balance
                                ? `Balance: ${erc20Balance} (${ethBalance})`
                                : `Balance: ${ethBalance}`
                            : null}
                        <br />
                        Notice: A small gas fee will occur for publishing.
                    </Typography>
                    <Button
                        className={classes.button}
                        style={{ marginLeft: 'auto' }}
                        color="primary"
                        variant="contained"
                        disabled={isButtonDisabled}
                        onClick={() =>
                            props.onDonate({
                                amount,
                                address: useSelectWalletResult.selectedWalletAddress!,
                                token: useSelectWalletResult.selectedToken!,
                                tokenType: useSelectWalletResult.selectedTokenType,
                            })
                        }>
                        {isButtonDisabled
                            ? 'Not valid'
                            : `Donate ${+amount.toFixed(3) === +amount.toFixed(9) ? '' : '~'}${+amount.toFixed(3)} ${
                                  selectedTokenType === EthereumTokenType.ETH ? 'ETH' : selectedToken?.symbol
                              }`}
                    </Button>
                </DialogActions>
            </ShadowRootDialog>
        </div>
    )
}

export interface DonateDialogProps extends DonateDialogUIProps {}

export function DonateDialog(props: DonateDialogProps) {
    const ui = getActivatedUI()
    const twitterClasses = {
        ...useTwitterDialog(),
        ...useTwitterButton(),
        ...useTwitterCloseButton(),
    }

    return ui.internalName === 'twitter' ? (
        <DonateDialogUI classes={twitterClasses} {...props} />
    ) : (
        <DonateDialogUI {...props} />
    )
}