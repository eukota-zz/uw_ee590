#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "homework4.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>
#include <vector>
#include <algorithm>

namespace
{
	bool USE_HARDCODED_LOCAL_WORKGROUP_SIZES = false;
	const char* FILENAME = "homework4.cl";
	size_t* HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
}

HWK4Class::HWK4Class()
	: GroupManager("Homework 4")
{
	groups_ = GroupFactory();
}


std::map<int, ProblemGroup*> HWK4Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;

	ProblemGroup* InputControl = GroupManagerInputControlFactory();
	InputControl->problems_[InputControl->problems_.size() + 1] = new Problem(&HWK4Class::UseHardcodedLocalWorkgroupSizes, "Use Hardcoded Local Workgroup Sizes");
	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* Homework4 = new ProblemGroup(1, "Homework 4");
	int num = 0;
	Homework4->problems_[++num] = new Problem(&exCL_reduce_v1, "Reduce V1: OpenCL");
	Homework4->problems_[++num] = new Problem(&exCL_reduce_v2, "Reduce V2: OpenCL");
	Homework4->problems_[++num] = new Problem(&exCL_reduce_v3, "Reduce V3: OpenCL");
	Homework4->problems_[++num] = new Problem(&exCL_inclusive_sum_scan_v1, "Inclusive Sum Scan V1: OpenCL");
	Homework4->problems_[++num] = new Problem(&exCL_inclusive_sum_scan_v2, "Inclusive Sum Scan V2: OpenCL");
	Homework4->problems_[++num] = new Problem(&exSeq_inclusive_sum_scan, "Inclusive Sum Scan: Sequential");
	pgs[Homework4->GroupNum()] = Homework4;
	return pgs;
}

///// Local Setting /////
int HWK4Class::UseHardcodedLocalWorkgroupSizes(ResultsStruct* results)
{
	std::cout << "Enter 1 to use hard coded work group sizes (currently " << USE_HARDCODED_LOCAL_WORKGROUP_SIZES << "): ";
	unsigned int i = (unsigned int)USE_HARDCODED_LOCAL_WORKGROUP_SIZES;
	std::cin >> i;
	USE_HARDCODED_LOCAL_WORKGROUP_SIZES = (i == 1);
	return 0;
}

////////////////// REDUCE /////////////////
int exCL_reduce_Helper(ResultsStruct* results, const std::string& kernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayHeight = 1;
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputCLSeq(inputA, arrayWidth, arrayHeight);
	tools::fillZeros(outputC, arrayWidth, arrayHeight);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputC, arrayWidth, arrayHeight))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, kernelName.c_str(), &err);
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
	HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1, HARDCODED_LOCAL_WORKGROUP_SIZE))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, arrayHeight, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		bool failed = false;
		float cumSum = 0.0;
		for (size_t i = 0; i < arrayWidth; ++i)
		{
			cumSum += inputA[i];
			if (i != 0 && resultPtr[i] != 0)
			{
				LogError("Verification failed at %d: Expected: %f. Actual: %f.\n", i, cumSum, resultPtr[i]);
				failed = true;
			}
		}
		if (resultPtr[0] != cumSum)
		{
			LogError("Verification failed at %d: Expected: %f. Actual: %f.\n", 0, cumSum, resultPtr[0]);
			failed = true;
		}

		if (!failed)
			LogInfo("Verification passed.\n");

		// Unmap Host Buffer from Local Data
		if (CL_SUCCESS != UnmapHostBufferFromLocal(&ocl.commandQueue, &dstMem, resultPtr))
			LogInfo("UnmapHostBufferFromLocal Failed.\n");
	}

	_aligned_free(inputA);
	_aligned_free(outputC);

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

int exCL_reduce_v1(ResultsStruct* results)
{
	HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	return exCL_reduce_Helper(results, "reduce_v1");
}

int exCL_reduce_v2(ResultsStruct* results)
{
	HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	return exCL_reduce_Helper(results, "reduce_v2");
}

int exCL_reduce_v3(ResultsStruct* results)
{
	HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	return exCL_reduce_Helper(results, "reduce_v3");
}

///////////////// SCAN //////////////////
int exCL_inclusive_sum_scan_Helper(ResultsStruct* results, const std::string& kernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayHeight = 1;
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputCLSeq(inputA, arrayWidth, arrayHeight);
	tools::fillZeros(outputC, arrayWidth, arrayHeight);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, arrayHeight))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputC, arrayWidth, arrayHeight))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, kernelName.c_str(), &err);
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
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &arrayWidth, 2))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[1] = { arrayWidth };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1, HARDCODED_LOCAL_WORKGROUP_SIZE))
		return -1;
	profiler.Stop();
	float runTime = profiler.Log();

	if (!SKIP_VERIFICATION)
	{
		// Map Host Buffer to Local Data
		cl_float* resultPtr = NULL;
		if (CL_SUCCESS != MapHostBufferToLocal(&ocl.commandQueue, &dstMem, arrayWidth, arrayHeight, &resultPtr))
		{
			LogError("Error: clEnqueueMapBuffer failed.\n");
			return -1;
		}

		// VERIFY DATA
		// We mapped dstMem to resultPtr, so resultPtr is ready and includes the kernel output !!!
		// Verify the results
		bool failed = false;
		float cumSum = 0.0;
		for (size_t i = 0; i < arrayWidth; ++i)
		{
			cumSum += inputA[i];
			if (resultPtr[i] != cumSum)
			{
				LogError("Verification failed at %d: Expected: %f. Actual: %f.\n", i, cumSum, resultPtr[i]);
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
	_aligned_free(outputC);

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

int exCL_inclusive_sum_scan_v1(ResultsStruct* results)
{
	// hard code work group size after finding optimal solution with KDF Sessions
	size_t localWorkSize[1] = { 16 };
	if (USE_HARDCODED_LOCAL_WORKGROUP_SIZES)
		HARDCODED_LOCAL_WORKGROUP_SIZE = localWorkSize;
	else
		HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	return exCL_inclusive_sum_scan_Helper(results, "inclusive_sum_scan_v1");
}

int exCL_inclusive_sum_scan_v2(ResultsStruct* results)
{
	size_t localWorkSize[1] = { 16 };
	if (USE_HARDCODED_LOCAL_WORKGROUP_SIZES)
		HARDCODED_LOCAL_WORKGROUP_SIZE = localWorkSize;
	else
		HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
	return exCL_inclusive_sum_scan_Helper(results, "inclusive_sum_scan_v2");
}

int exSeq_inclusive_sum_scan(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	const cl_uint arrayHeight = GLOBAL_ARRAY_HEIGHT;

	// allocate memory
	cl_float* vectorA = (cl_float*)malloc((sizeof(cl_float) * arrayWidth * arrayHeight));
	cl_float* outputC = (cl_float*)malloc((sizeof(cl_float) * arrayWidth * arrayHeight));

	// generate data
	tools::generateInputCL(vectorA, arrayWidth, arrayHeight);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	outputC[0] = vectorA[0];
	for (size_t i = 1; i < arrayWidth; i++)
		outputC[i] = outputC[i - 1] + vectorA[i];

	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(outputC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}
