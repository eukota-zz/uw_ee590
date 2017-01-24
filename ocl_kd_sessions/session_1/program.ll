; ModuleID = 'C:\Users\darrellr\AppData\Local\Temp\ab6d2a94-d49d-4b2d-815f-2152c4a30285.ll'
target datalayout = "e-p:64:64:64-i1:8:8-i8:8:8-i16:16:16-i32:32:32-i64:64:64-f16:16:16-f32:32:32-f64:64:64-f80:128:128-v16:16:16-v24:32:32-v32:32:32-v48:64:64-v64:64:64-v96:128:128-v128:128:128-v192:256:256-v256:256:256-v512:512:512-v1024:1024:1024-f80:128:128-n8:16:32:64"
target triple = "igil_64_GEN9"

define void @elementwiseMatrixPower(float addrspace(1)* %pA, i32 %K, float addrspace(1)* %pB) {
  %1 = alloca float addrspace(1)*, align 8
  %2 = alloca i32, align 4
  %3 = alloca float addrspace(1)*, align 8
  %x = alloca i32, align 4
  %y = alloca i32, align 4
  %width = alloca i32, align 4
  %id = alloca i32, align 4
  store float addrspace(1)* %pA, float addrspace(1)** %1, align 8
  store i32 %K, i32* %2, align 4
  store float addrspace(1)* %pB, float addrspace(1)** %3, align 8
  %4 = call i64 @_Z13get_global_idj(i32 0)
  %5 = trunc i64 %4 to i32
  store i32 %5, i32* %x, align 4
  %6 = call i64 @_Z13get_global_idj(i32 1)
  %7 = trunc i64 %6 to i32
  store i32 %7, i32* %y, align 4
  %8 = call i64 @_Z15get_global_sizej(i32 0)
  %9 = trunc i64 %8 to i32
  store i32 %9, i32* %width, align 4
  %10 = load i32* %y, align 4
  %11 = load i32* %width, align 4
  %12 = mul nsw i32 %10, %11
  %13 = load i32* %x, align 4
  %14 = add nsw i32 %12, %13
  store i32 %14, i32* %id, align 4
  %15 = load i32* %id, align 4
  %16 = sext i32 %15 to i64
  %17 = load float addrspace(1)** %1, align 8
  %18 = getelementptr inbounds float addrspace(1)* %17, i64 %16
  %19 = load float addrspace(1)* %18, align 4
  %20 = load i32* %2, align 4
  %21 = uitofp i32 %20 to float
  %22 = call float @_Z3powff(float %19, float %21)
  %23 = load i32* %id, align 4
  %24 = sext i32 %23 to i64
  %25 = load float addrspace(1)** %3, align 8
  %26 = getelementptr inbounds float addrspace(1)* %25, i64 %24
  store float %22, float addrspace(1)* %26, align 4
  ret void
}

declare i64 @_Z13get_global_idj(i32)

declare i64 @_Z15get_global_sizej(i32)

declare float @_Z3powff(float, float)

define void @elementwiseMatrixPower_Manual(float addrspace(1)* %pA, i32 %K, float addrspace(1)* %pB) {
  %1 = alloca float addrspace(1)*, align 8
  %2 = alloca i32, align 4
  %3 = alloca float addrspace(1)*, align 8
  %x = alloca i32, align 4
  %y = alloca i32, align 4
  %width = alloca i32, align 4
  %id = alloca i32, align 4
  %prod = alloca float, align 4
  %out = alloca float, align 4
  %i = alloca i32, align 4
  store float addrspace(1)* %pA, float addrspace(1)** %1, align 8
  store i32 %K, i32* %2, align 4
  store float addrspace(1)* %pB, float addrspace(1)** %3, align 8
  %4 = call i64 @_Z13get_global_idj(i32 0)
  %5 = trunc i64 %4 to i32
  store i32 %5, i32* %x, align 4
  %6 = call i64 @_Z13get_global_idj(i32 1)
  %7 = trunc i64 %6 to i32
  store i32 %7, i32* %y, align 4
  %8 = call i64 @_Z15get_global_sizej(i32 0)
  %9 = trunc i64 %8 to i32
  store i32 %9, i32* %width, align 4
  %10 = load i32* %y, align 4
  %11 = load i32* %width, align 4
  %12 = mul nsw i32 %10, %11
  %13 = load i32* %x, align 4
  %14 = add nsw i32 %12, %13
  store i32 %14, i32* %id, align 4
  %15 = load i32* %id, align 4
  %16 = sext i32 %15 to i64
  %17 = load float addrspace(1)** %1, align 8
  %18 = getelementptr inbounds float addrspace(1)* %17, i64 %16
  %19 = load float addrspace(1)* %18, align 4
  store float %19, float* %prod, align 4
  store float 1.000000e+00, float* %out, align 4
  store i32 0, i32* %i, align 4
  br label %20

; <label>:20                                      ; preds = %28, %0
  %21 = load i32* %i, align 4
  %22 = load i32* %2, align 4
  %23 = icmp ult i32 %21, %22
  br i1 %23, label %24, label %31

; <label>:24                                      ; preds = %20
  %25 = load float* %out, align 4
  %26 = load float* %prod, align 4
  %27 = fmul float %25, %26
  store float %27, float* %out, align 4
  br label %28

; <label>:28                                      ; preds = %24
  %29 = load i32* %i, align 4
  %30 = add i32 %29, 1
  store i32 %30, i32* %i, align 4
  br label %20

; <label>:31                                      ; preds = %20
  %32 = load float* %out, align 4
  %33 = load i32* %id, align 4
  %34 = sext i32 %33 to i64
  %35 = load float addrspace(1)** %3, align 8
  %36 = getelementptr inbounds float addrspace(1)* %35, i64 %34
  store float %32, float addrspace(1)* %36, align 4
  ret void
}

define void @progressiveArraySum(float addrspace(1)* %p1b_A, float addrspace(1)* %p1b_B) {
  %1 = alloca float addrspace(1)*, align 8
  %2 = alloca float addrspace(1)*, align 8
  %id = alloca i32, align 4
  %out = alloca float, align 4
  %i = alloca i32, align 4
  store float addrspace(1)* %p1b_A, float addrspace(1)** %1, align 8
  store float addrspace(1)* %p1b_B, float addrspace(1)** %2, align 8
  %3 = call i64 @_Z13get_global_idj(i32 0)
  %4 = trunc i64 %3 to i32
  store i32 %4, i32* %id, align 4
  store float 0.000000e+00, float* %out, align 4
  store i32 0, i32* %i, align 4
  br label %5

; <label>:5                                       ; preds = %17, %0
  %6 = load i32* %i, align 4
  %7 = load i32* %id, align 4
  %8 = icmp ule i32 %6, %7
  br i1 %8, label %9, label %20

; <label>:9                                       ; preds = %5
  %10 = load i32* %i, align 4
  %11 = zext i32 %10 to i64
  %12 = load float addrspace(1)** %1, align 8
  %13 = getelementptr inbounds float addrspace(1)* %12, i64 %11
  %14 = load float addrspace(1)* %13, align 4
  %15 = load float* %out, align 4
  %16 = fadd float %15, %14
  store float %16, float* %out, align 4
  br label %17

; <label>:17                                      ; preds = %9
  %18 = load i32* %i, align 4
  %19 = add i32 %18, 1
  store i32 %19, i32* %i, align 4
  br label %5

; <label>:20                                      ; preds = %5
  %21 = load float* %out, align 4
  %22 = load i32* %id, align 4
  %23 = zext i32 %22 to i64
  %24 = load float addrspace(1)** %2, align 8
  %25 = getelementptr inbounds float addrspace(1)* %24, i64 %23
  store float %21, float addrspace(1)* %25, align 4
  ret void
}

!opencl.kernels = !{!0, !7, !8}
!opencl.compiler.options = !{!15}
!opencl.enable.FP_CONTRACT = !{}

!0 = metadata !{void (float addrspace(1)*, i32, float addrspace(1)*)* @elementwiseMatrixPower, metadata !1, metadata !2, metadata !3, metadata !4, metadata !5, metadata !6}
!1 = metadata !{metadata !"kernel_arg_addr_space", i32 1, i32 0, i32 1}
!2 = metadata !{metadata !"kernel_arg_access_qual", metadata !"none", metadata !"none", metadata !"none"}
!3 = metadata !{metadata !"kernel_arg_type", metadata !"float*", metadata !"uint", metadata !"float*"}
!4 = metadata !{metadata !"kernel_arg_type_qual", metadata !"", metadata !"", metadata !""}
!5 = metadata !{metadata !"kernel_arg_base_type", metadata !"float*", metadata !"uint", metadata !"float*"}
!6 = metadata !{metadata !"kernel_arg_name", metadata !"pA", metadata !"K", metadata !"pB"}
!7 = metadata !{void (float addrspace(1)*, i32, float addrspace(1)*)* @elementwiseMatrixPower_Manual, metadata !1, metadata !2, metadata !3, metadata !4, metadata !5, metadata !6}
!8 = metadata !{void (float addrspace(1)*, float addrspace(1)*)* @progressiveArraySum, metadata !9, metadata !10, metadata !11, metadata !12, metadata !13, metadata !14}
!9 = metadata !{metadata !"kernel_arg_addr_space", i32 1, i32 1}
!10 = metadata !{metadata !"kernel_arg_access_qual", metadata !"none", metadata !"none"}
!11 = metadata !{metadata !"kernel_arg_type", metadata !"float*", metadata !"float*"}
!12 = metadata !{metadata !"kernel_arg_type_qual", metadata !"", metadata !""}
!13 = metadata !{metadata !"kernel_arg_base_type", metadata !"float*", metadata !"float*"}
!14 = metadata !{metadata !"kernel_arg_name", metadata !"p1b_A", metadata !"p1b_B"}
!15 = metadata !{metadata !"-cl-std=CL2.0", metadata !"-cl-kernel-arg-info"}
