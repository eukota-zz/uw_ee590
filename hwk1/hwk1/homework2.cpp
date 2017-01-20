#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "homework2.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>
#include <vector>
#include <algorithm>

/////////// HOMEWORK 2
namespace
{
	const char* FILENAME = "homework2.cl";
}

HWK2Class::HWK2Class()
	: GroupManager("Homework 2")
{
	groups_ = GroupFactory();

	// Since all of Homework 2 calls for 4096, default it to that and notify user
	GLOBAL_ARRAY_WIDTH = 4096;
	printf("Default M value changed to %d\n", GLOBAL_ARRAY_WIDTH);
}


std::map<int, ProblemGroup*> HWK2Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;

	ProblemGroup* InputControl = GroupManagerInputControlFactory();
	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* Homework2 = new ProblemGroup(1, "Homework 2");
	int num = 0;
	Homework2->problems_[++num] = new Problem(&exCL_DotProduct_Manual   , "Dot Product Manual: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_DotProduct          , "Dot Product: OpenCL");
	Homework2->problems_[++num] = new Problem(&exSequential_DotProduct  , "Dot Product: Sequential");
	Homework2->problems_[++num] = new Problem(&exCL_MAD                 , "MAD: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_FMA                 , "FMA: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_FMA_Manual          , "FMA_Manual: OpenCL");
	Homework2->problems_[++num] = new Problem(&exSequential_MAD         , "MAD: Sequential");
	Homework2->problems_[++num] = new Problem(&exCL_CrossProduct        , "Cross Prodcut: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_CrossProduct_Manual , "Cross Product Manual: OpenCL");
	Homework2->problems_[++num] = new Problem(&exSequential_CrossProduct, "Cross Product: Sequential");
	Homework2->problems_[++num] = new Problem(&exCL_FastLength          , "Fast Length: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_NativeSquareRoot    , "Native Square Root: OpenCL");
	Homework2->problems_[++num] = new Problem(&exCL_SquareRoot          , "Square Root: OpenCL");
	Homework2->problems_[++num] = new Problem(&exSequential_SquareRoot  , "Square Root: Sequential");
	pgs[Homework2->GroupNum()] = Homework2;
	return pgs;
}

////////////////// DOT PRODUCT /////////////////
// Since DotProduct and DotProduct_Manual use identical input types, I use the exact same function call and just vary the KernelName
int exCL_DotProduct_Helper(ResultsStruct* results, const std::string& KernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint optimizedSizeFloat4 = ((sizeof(cl_float4) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float4* inputA = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_float4* inputB = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == inputB || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputFloat4(inputA, arrayWidth, 1);
	tools::generateInputFloat4(inputB, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           srcB;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcB, inputB, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputC, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, KernelName.c_str(), &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 2))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth;
		bool failed = false;
		for (unsigned int k = 0; k < size; ++k)
		{
			cl_float expectedValue = inputA[k].x*inputB[k].x + inputA[k].y*inputB[k].y + inputA[k].z*inputB[k].z + inputA[k].w*inputB[k].w;
			if (resultPtr[k] != expectedValue)			
			{				
				LogError("Verification failed at %d: Expected: %f. Actual: %f.\n", k, expectedValue, resultPtr[k]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(outputC);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

int exCL_DotProduct_Manual(ResultsStruct* results)
{
	return exCL_DotProduct_Helper(results, "DotProduct_Manual");
}

int exCL_DotProduct(ResultsStruct* results)
{
	return exCL_DotProduct_Helper(results, "DotProduct");
}

int exSequential_DotProduct(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;

	// allocate memory
	cl_float4* vectorA = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));
	cl_float4* vectorB = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));
	cl_float* outputC = (cl_float*)malloc((sizeof(cl_float) * arrayWidth));

	// generate data
	tools::generateInputFloat4(vectorA, arrayWidth, 1);
	tools::generateInputFloat4(vectorB, arrayWidth, 1);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	for (unsigned int k = 0; k < arrayWidth; ++k)
		outputC[k] = vectorA[k].x*vectorB[k].x + vectorA[k].y*vectorB[k].y + vectorA[k].z*vectorB[k].z + vectorA[k].w*vectorB[k].w;
	profiler.Stop();
	float runTime = profiler.Log();
	
	// free memory
	free(vectorA);
	free(vectorB);
	free(outputC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

///////////////// MAD and FMA ///////////////////
// Since MAD, FMA, and FMA Manual all have the same input types, I use a helper function to execute them while varying the KernelName
int exCL_MAD_FMA_Helper(ResultsStruct* results, const std::string& KernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint optimizedSizeFloat16 = ((sizeof(cl_float16) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float16* inputA = (cl_float16*)_aligned_malloc(optimizedSizeFloat16, 4096);
	cl_float16* inputB = (cl_float16*)_aligned_malloc(optimizedSizeFloat16, 4096);
	cl_float16* inputC = (cl_float16*)_aligned_malloc(optimizedSizeFloat16, 4096);
	cl_float16* outputD = (cl_float16*)_aligned_malloc(optimizedSizeFloat16, 4096);
	if (NULL == inputA || NULL == inputB || NULL == inputC || NULL == outputD)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputFloat16(inputA, arrayWidth, 1);
	tools::generateInputFloat16(inputB, arrayWidth, 1);
	tools::generateInputFloat16(inputC, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           srcB;              // hold second source buffer
	cl_mem           srcC;              // hold third source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcB, inputB, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcC, inputC, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputD, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, KernelName.c_str(), &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcC, 2))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 3))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float16* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth;
		bool failed = false;
		for (unsigned int k = 0; k < size; ++k)
		{
			if (resultPtr[k].s0 != inputA[k].s0*inputB[k].s0 + inputC[k].s0
				|| resultPtr[k].s1 != inputA[k].s1*inputB[k].s1 + inputC[k].s1
				|| resultPtr[k].s2 != inputA[k].s2*inputB[k].s2 + inputC[k].s2
				|| resultPtr[k].s3 != inputA[k].s3*inputB[k].s3 + inputC[k].s3
				|| resultPtr[k].s4 != inputA[k].s4*inputB[k].s4 + inputC[k].s4
				|| resultPtr[k].s5 != inputA[k].s5*inputB[k].s5 + inputC[k].s5
				|| resultPtr[k].s6 != inputA[k].s6*inputB[k].s6 + inputC[k].s6
				|| resultPtr[k].s7 != inputA[k].s7*inputB[k].s7 + inputC[k].s7
				|| resultPtr[k].s8 != inputA[k].s8*inputB[k].s8 + inputC[k].s8
				|| resultPtr[k].s9 != inputA[k].s9*inputB[k].s9 + inputC[k].s9
				|| resultPtr[k].sa != inputA[k].sa*inputB[k].sa + inputC[k].sa
				|| resultPtr[k].sb != inputA[k].sb*inputB[k].sb + inputC[k].sb
				|| resultPtr[k].sc != inputA[k].sc*inputB[k].sc + inputC[k].sc
				|| resultPtr[k].sd != inputA[k].sd*inputB[k].sd + inputC[k].sd
				|| resultPtr[k].se != inputA[k].se*inputB[k].se + inputC[k].se
				|| resultPtr[k].sf != inputA[k].sf*inputB[k].sf + inputC[k].sf)
			{
				LogError("Verification failed at %d.\n", k);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(inputC);
	_aligned_free(outputD);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcC))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

int exCL_MAD(ResultsStruct* results)
{
	return exCL_MAD_FMA_Helper(results, "MAD");
}

int exCL_FMA(ResultsStruct* results)
{
	return exCL_MAD_FMA_Helper(results, "FMA");
}

int exCL_FMA_Manual(ResultsStruct* results)
{
	return exCL_MAD_FMA_Helper(results, "FMA_Manual");
}

int exSequential_MAD(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;

	// allocate memory
	cl_float16* vectorA = (cl_float16*)malloc((sizeof(cl_float16) * arrayWidth));
	cl_float16* vectorB = (cl_float16*)malloc((sizeof(cl_float16) * arrayWidth));
	cl_float16* vectorC = (cl_float16*)malloc((sizeof(cl_float16) * arrayWidth));
	cl_float16* vectorD = (cl_float16*)malloc((sizeof(cl_float16) * arrayWidth));

	// generate data
	tools::generateInputFloat16(vectorA, arrayWidth, 1);
	tools::generateInputFloat16(vectorB, arrayWidth, 1);
	tools::generateInputFloat16(vectorC, arrayWidth, 1);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	for (unsigned int idx = 0; idx < arrayWidth; ++idx)
	{
		vectorD[idx].s0 = vectorA[idx].s0*vectorB[idx].s0 + vectorC[idx].s0;
		vectorD[idx].s1 = vectorA[idx].s1*vectorB[idx].s1 + vectorC[idx].s1;
		vectorD[idx].s2 = vectorA[idx].s2*vectorB[idx].s2 + vectorC[idx].s2;
		vectorD[idx].s3 = vectorA[idx].s3*vectorB[idx].s3 + vectorC[idx].s3;
		vectorD[idx].s4 = vectorA[idx].s4*vectorB[idx].s4 + vectorC[idx].s4;
		vectorD[idx].s5 = vectorA[idx].s5*vectorB[idx].s5 + vectorC[idx].s5;
		vectorD[idx].s6 = vectorA[idx].s6*vectorB[idx].s6 + vectorC[idx].s6;
		vectorD[idx].s7 = vectorA[idx].s7*vectorB[idx].s7 + vectorC[idx].s7;
		vectorD[idx].s8 = vectorA[idx].s8*vectorB[idx].s8 + vectorC[idx].s8;
		vectorD[idx].s9 = vectorA[idx].s9*vectorB[idx].s9 + vectorC[idx].s9;
		vectorD[idx].sa = vectorA[idx].sa*vectorB[idx].sa + vectorC[idx].sa;
		vectorD[idx].sb = vectorA[idx].sb*vectorB[idx].sb + vectorC[idx].sb;
		vectorD[idx].sc = vectorA[idx].sc*vectorB[idx].sc + vectorC[idx].sc;
		vectorD[idx].sd = vectorA[idx].sd*vectorB[idx].sd + vectorC[idx].sd;
		vectorD[idx].se = vectorA[idx].se*vectorB[idx].se + vectorC[idx].se;
		vectorD[idx].sf = vectorA[idx].sf*vectorB[idx].sf + vectorC[idx].sf;
	}
	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(vectorB);
	free(vectorC);
	free(vectorD);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

////////////////// CROSS PRODUCT and CROSS PRODUCT REVERSE
int exCL_CrossProduct_Helper(ResultsStruct* results, const std::string& KernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint optimizedSizeFloat4 = ((sizeof(cl_float4) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float4* inputA = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_float4* inputB = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_float4* outputC = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	if (NULL == inputA || NULL == inputB || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputFloat4(inputA, arrayWidth, 1);
	tools::generateInputFloat4(inputB, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           srcB;              // hold second source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcB, inputB, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputC, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, KernelName.c_str(), &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 2))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float4* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth;
		bool failed = false;
		for (unsigned int idx = 0; idx < size; ++idx)
		{
			cl_float x =       (inputA[idx].y*inputB[idx].z - inputA[idx].z*inputB[idx].y);
			cl_float y = -1.0f*(inputA[idx].x*inputB[idx].z - inputA[idx].z*inputB[idx].x);
			cl_float z =       (inputA[idx].x*inputB[idx].y - inputA[idx].y*inputB[idx].x);
			cl_float w = 0.0f;
			if(resultPtr[idx].x != x || resultPtr[idx].y != y || resultPtr[idx].z !=z)
			{
				LogError("Verification failed at %d.\n", idx);
				printf("Expected: (%f, %f, %f) %f. Actual: (%f, %f, %f) %f.\n", x, y, z, w, resultPtr[idx].x, resultPtr[idx].y, resultPtr[idx].z, resultPtr[idx].w);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(inputB);
	_aligned_free(outputC);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(srcB))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

int exCL_CrossProduct(ResultsStruct* results)
{
	return exCL_CrossProduct_Helper(results, "CrossProduct");
}

int exCL_CrossProduct_Manual(ResultsStruct* results)
{
	return exCL_CrossProduct_Helper(results, "CrossProduct_Manual");
}

int exSequential_CrossProduct(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;

	// allocate memory
	cl_float4* vectorA = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));
	cl_float4* vectorB = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));
	cl_float4* vectorC = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));

	// generate data
	tools::generateInputFloat4(vectorA, arrayWidth, 1);
	tools::generateInputFloat4(vectorB, arrayWidth, 1);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	for (unsigned int idx = 0; idx < arrayWidth; ++idx)
	{
		vectorC[idx].x =       (vectorA[idx].y*vectorB[idx].z - vectorA[idx].z*vectorB[idx].y);
		vectorC[idx].y = -1.0f*(vectorA[idx].x*vectorB[idx].z - vectorA[idx].z*vectorB[idx].x);
		vectorC[idx].z =       (vectorA[idx].x*vectorB[idx].y - vectorA[idx].y*vectorB[idx].x);
	}
	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(vectorB);
	free(vectorC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

/////////////// SQUARE ROOT ////////////////
int exCL_FastLength(ResultsStruct* results)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint optimizedSizeFloat4 = ((sizeof(cl_float4) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float4* inputA = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float* outputB = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == outputB)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputFloat4(inputA, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputB, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, "FastLength", &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 1))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth;
		bool failed = false;
		for (unsigned int idx = 0; idx < size; ++idx)
		{
			cl_float x = sqrt(inputA[idx].x*inputA[idx].x + inputA[idx].y*inputA[idx].y + inputA[idx].z*inputA[idx].z + inputA[idx].w*inputA[idx].w);
			if (abs(resultPtr[idx] - x) > dmath::MIN_DIFF)
			{
				LogError("Verification failed at %d.\n", idx);
				printf("Expected: %f. Actual: %f.", x, resultPtr[idx]);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(outputB);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

int exCL_SquareRoot_Helper(ResultsStruct* results, const std::string& KernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint optimizedSizeFloat4 = ((sizeof(cl_float4) * arrayWidth - 1) / 64 + 1) * 64;
	cl_float4* inputA = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	cl_float4* outputB = (cl_float4*)_aligned_malloc(optimizedSizeFloat4, 4096);
	if (NULL == inputA || NULL == outputB)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputFloat4(inputA, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputB, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, KernelName.c_str(), &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 1))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float4* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, 1, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		unsigned int size = arrayWidth;
		bool failed = false;
		for (unsigned int idx = 0; idx < size; ++idx)
		{
			if (abs(resultPtr[idx].x - sqrt(inputA[idx].x) > dmath::MIN_DIFF)
				|| abs(resultPtr[idx].y - sqrt(inputA[idx].y) > dmath::MIN_DIFF)
				|| abs(resultPtr[idx].z - sqrt(inputA[idx].z) > dmath::MIN_DIFF)
				|| abs(resultPtr[idx].w - sqrt(inputA[idx].w) > dmath::MIN_DIFF))
			{
				LogError("Verification failed at %d.\n", idx);
				printf("Expected: %f. Actual: %f.", sqrt(inputA[idx].x), resultPtr[idx].x);
				failed = true;
			}
		}
		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(outputB);

	if (CL_SUCCESS != clReleaseMemObject(srcA))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));
	if (CL_SUCCESS != clReleaseMemObject(dstMem))
		LogError("Error: clReleaseMemObject returned '%s'.\n", TranslateOpenCLError(err));

	results->WindowsRunTime = runTime;
	results->HasWindowsRunTime = true;
	results->OpenCLRunTime = ocl.RunTimeMS();
	results->HasOpenCLRunTime = true;
	return 0;
}

int exCL_NativeSquareRoot(ResultsStruct* results)
{
	return exCL_SquareRoot_Helper(results, "NativeSquareRoot");
}

int exCL_SquareRoot(ResultsStruct* results)
{
	return exCL_SquareRoot_Helper(results, "SquareRoot");
}

int exSequential_SquareRoot(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;

	// allocate memory
	cl_float4* vectorA = (cl_float4*)malloc((sizeof(cl_float4) * arrayWidth));
	cl_float* vectorB = (cl_float*)malloc((sizeof(cl_float) * arrayWidth));

	// generate data
	tools::generateInputFloat4(vectorA, arrayWidth, 1);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	for (unsigned int idx = 0; idx < arrayWidth; ++idx)
	{
		vectorB[idx] = sqrt(vectorA[idx].x*vectorA[idx].x + vectorA[idx].y*vectorA[idx].y + vectorA[idx].z*vectorA[idx].z + vectorA[idx].w*vectorA[idx].w);
	}
	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(vectorB);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}
