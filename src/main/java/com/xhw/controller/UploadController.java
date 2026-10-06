package com.xhw.controller;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import com.xhw.dto.Result;
import com.xhw.utils.SystemConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("upload")
public class UploadController {

    /**
     * 图片落盘根目录。优先取 application.yaml 的 xhw.upload-dir，
     * 没配则退回 {@link SystemConstants#IMAGE_UPLOAD_DIR}。
     * <p>
     * 它必须指向 nginx 的 web 根目录下的 imgs/，否则文件写进去了也访问不到。
     */
    @Value("${xhw.upload-dir:}")
    private String uploadDirConf;

    private File uploadRoot() {
        String dir = StrUtil.isNotBlank(uploadDirConf)
                ? uploadDirConf
                : SystemConstants.IMAGE_UPLOAD_DIR;
        return new File(dir);
    }

    @PostMapping("blog")
    public Result uploadImage(@RequestParam("file") MultipartFile image) {
        try {
            // 获取原始文件名称
            String originalFilename = image.getOriginalFilename();
            // 生成新文件名
            String fileName = createNewFileName(originalFilename);
            File root = uploadRoot();
            File target = new File(root, fileName);
            // transferTo 不会自动建父目录，这里显式创建
            File parent = target.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) {
                return Result.fail("创建上传目录失败：" + parent.getAbsolutePath());
            }
            image.transferTo(target);
            log.debug("文件上传成功，{} -> {}", fileName, target.getAbsolutePath());
            // 返回给前端的是相对 web 根目录的路径，前端拼上 /imgs 即可访问
            return Result.ok(fileName);
        } catch (IOException e) {
            log.error("文件上传失败", e);
            return Result.fail("文件上传失败：" + e.getMessage());
        }
    }

    @GetMapping("/blog/delete")
    public Result deleteBlogImg(@RequestParam("name") String filename) {
        if (StrUtil.isBlank(filename)) {
            return Result.fail("文件名为空");
        }
        // 落盘根目录是 .../imgs，而前端手上拿到的路径是 /imgs/blogs/x/y/z.jpg，
        // 少剥一层就会去 .../imgs/imgs/... 找一个不存在的文件 —— 删除静默失效、文件越堆越多。
        String name = filename.trim();
        if (name.startsWith("/imgs/")) {
            name = name.substring("/imgs".length());
        }
        while (name.startsWith("/")) {
            name = name.substring(1);
        }
        // 别让人用 ../ 删到 web 根目录外面去
        if (name.contains("..")) {
            return Result.fail("错误的文件名称");
        }
        File file = new File(uploadRoot(), name);
        if (file.isDirectory()) {
            return Result.fail("错误的文件名称");
        }
        FileUtil.del(file);
        log.debug("删除上传图片：{}", file.getAbsolutePath());
        return Result.ok();
    }

    private String createNewFileName(String originalFilename) {
        // 获取后缀
        String suffix = StrUtil.subAfter(originalFilename, ".", true);
        // 生成目录
        String name = UUID.randomUUID().toString();
        int hash = name.hashCode();
        int d1 = hash & 0xF;
        int d2 = (hash >> 4) & 0xF;
        // 判断目录是否存在
        File dir = new File(uploadRoot(), StrUtil.format("/blogs/{}/{}", d1, d2));
        if (!dir.exists()) {
            dir.mkdirs();
        }
        // 生成文件名
        return StrUtil.format("/blogs/{}/{}/{}.{}", d1, d2, name, suffix);
    }
}
