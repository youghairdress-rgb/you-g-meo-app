import { useState, useCallback } from 'react';
import { storage } from '../lib/firebase';
import {
    ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject, getMetadata
} from 'firebase/storage';

/**
 * Firebase Storage を使ったメディア管理フック
 * posts/ と stories/ の2ディレクトリを管理
 */
export function useStorage() {
    const [files, setFiles] = useState({ posts: [], stories: [] });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    /**
     * ファイルをアップロード
     * @param {File} file - ファイルオブジェクト
     * @param {"posts"|"stories"} folder - 保存先フォルダ
     */
    const uploadFile = useCallback(async (file, folder = 'posts') => {
        if (!file) return null;
        setUploading(true);
        setUploadProgress(0);

        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${folder}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, filePath);

            return new Promise((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, file, {
                    contentType: file.type,
                });

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error('Upload Error:', error);
                        setUploading(false);
                        reject(error);
                    },
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploading(false);
                        setUploadProgress(100);
                        // 一覧を再取得
                        await listFiles(folder);
                        resolve({ url, path: filePath, name: file.name });
                    }
                );
            });
        } catch (error) {
            setUploading(false);
            throw error;
        }
    }, []);

    /**
     * 指定フォルダのファイル一覧を取得
     * @param {"posts"|"stories"} folder
     */
    const listFiles = useCallback(async (folder = 'posts') => {
        try {
            const folderRef = ref(storage, folder);
            const result = await listAll(folderRef);

            const fileList = await Promise.all(
                result.items.map(async (itemRef) => {
                    try {
                        const url = await getDownloadURL(itemRef);
                        const metadata = await getMetadata(itemRef);
                        const isVideo = metadata.contentType?.startsWith('video/');
                        return {
                            name: itemRef.name,
                            fullPath: itemRef.fullPath,
                            url,
                            contentType: metadata.contentType,
                            mediaType: isVideo ? 'video' : 'image',
                            timeCreated: metadata.timeCreated,
                        };
                    } catch (e) {
                        console.error('File metadata error:', e);
                        return null;
                    }
                })
            );

            const validFiles = fileList.filter(Boolean).sort((a, b) =>
                new Date(b.timeCreated) - new Date(a.timeCreated)
            );

            setFiles(prev => ({ ...prev, [folder]: validFiles }));
            return validFiles;
        } catch (error) {
            console.error('List Error:', error);
            return [];
        }
    }, []);

    /**
     * ファイルを削除
     * @param {string} fullPath - Storage内のフルパス
     * @param {"posts"|"stories"} folder - 再取得用フォルダ名
     */
    const deleteFile = useCallback(async (fullPath, folder = 'posts') => {
        try {
            const fileRef = ref(storage, fullPath);
            await deleteObject(fileRef);
            await listFiles(folder);
        } catch (error) {
            console.error('Delete Error:', error);
            throw error;
        }
    }, [listFiles]);

    return {
        files,
        uploading,
        uploadProgress,
        uploadFile,
        listFiles,
        deleteFile,
    };
}
