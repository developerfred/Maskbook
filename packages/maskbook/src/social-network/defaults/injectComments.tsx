import { memo } from 'react'
import type { PostInfo } from '../../social-network-next/PostInfo'
import { MutationObserverWatcher, ValueRef } from '@dimensiondev/holoflows-kit'
import { renderInShadowRoot } from '../../utils/shadow-root/renderInShadowRoot'
import { PostComment, PostCommentProps } from '../../components/InjectedComponents/PostComments'
import { makeStyles } from '@material-ui/core'
import { PostInfoContext } from '../../components/DataSource/usePostInfo'
import { noop } from 'lodash-es'
import { collectNodeText } from '../../social-network-provider/facebook.com/collecting/posts'
import { startWatch } from '../../utils/watcher'

interface injectPostCommentsDefaultConfig {
    needZip?(): void
}
/**
 * Creat a default implementation of injectPostComments
 */
export function injectPostCommentsDefault<T extends string>(
    config: injectPostCommentsDefaultConfig = {},
    additionalPropsToPostComment: (classes: Record<T, string>) => Partial<PostCommentProps> = () => ({}),
    useCustomStyles: (props?: any) => Record<T, string> = makeStyles({}) as any,
) {
    const { needZip } = config
    const PostCommentDefault = memo(function PostCommentDefault(props: Pick<PostCommentProps, 'needZip' | 'comment'>) {
        const classes = useCustomStyles()
        const additional = additionalPropsToPostComment(classes)
        return <PostComment {...props} {...additional} />
    })
    return function injectPostComments(current: PostInfo, signal?: AbortSignal) {
        const selector = current.commentsSelector
        if (!selector) return noop
        const commentWatcher = new MutationObserverWatcher(selector, current.rootNode).useForeach(
            (commentNode, key, meta) => {
                const commentRef = new ValueRef(collectNodeText(commentNode))
                const needZipF =
                    needZip ||
                    (() => {
                        commentNode.style.whiteSpace = 'nowrap'
                        commentNode.style.overflow = 'hidden'
                    })
                const unmount = renderInShadowRoot(
                    <PostInfoContext.Provider value={current}>
                        <PostCommentDefault needZip={needZipF} comment={commentRef} {...current} />
                    </PostInfoContext.Provider>,
                    { shadow: () => meta.afterShadow, signal },
                )
                return {
                    onNodeMutation() {
                        commentRef.value = collectNodeText(commentNode)
                    },
                    onTargetChanged() {
                        commentRef.value = collectNodeText(commentNode)
                    },
                    onRemove() {
                        unmount()
                    },
                }
            },
        )
        startWatch(commentWatcher, signal)

        return () => commentWatcher.stopWatch()
    }
}
