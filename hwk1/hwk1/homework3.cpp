#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "homework3.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>
#include <vector>
#include <algorithm>

/////////// HOMEWORK 2
namespace
{
	const char* FILENAME = "homework3.cl";
}

HWK3Class::HWK3Class()
	: GroupManager("Homework 2")
{
	groups_ = GroupFactory();

	// Since all of Homework 3 calls for 4096, default it to that and notify user
	GLOBAL_ARRAY_WIDTH = 4096;
	printf("Default M value changed to %d\n", GLOBAL_ARRAY_WIDTH);
}


std::map<int, ProblemGroup*> HWK3Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;

	ProblemGroup* InputControl = GroupManagerInputControlFactory();
	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* Homework3 = new ProblemGroup(1, "Homework 3");
	int num = 0;
	Homework3->problems_[++num] = new Problem(&exCL_MatrixPower, "Matrix Power: OpenCL");
	Homework3->problems_[++num] = new Problem(&exCL_MatrixPower_Manual, "Matrix Power Manual: OpenCL");
	Homework3->problems_[++num] = new Problem(&exSequential_MatrixPower, "Matrix Power: Sequential");
	Homework3->problems_[++num] = new Problem(&exCL_ProgressiveArraySum, "Progressive Array Sum: OpenCL");
	Homework3->problems_[++num] = new Problem(&exSequential_ProgressiveArraySum, "Progressive Array Sum: Sequential");
	pgs[Homework3->GroupNum()] = Homework3;
	return pgs;
}


////////////////// MATRIX POWER /////////////////
// Since MatrixPower and MatrixPower_Manual use identical input types, I use the exact same function call and just vary the KernelName
int exCL_MatrixPower_Helper(ResultsStruct* results, const std::string& KernelName)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayHeight = GLOBAL_ARRAY_HEIGHT;
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	cl_uint inputB = 2;
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == inputB || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputCL(inputA, arrayWidth, arrayHeight);
	inputB = 2; // power of 2

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
	ocl.kernel = clCreateKernel(ocl.program, KernelName.c_str(), &err);
	if (CL_SUCCESS != err)
	{
		LogError("Error: clCreateKernel returned %s\n", TranslateOpenCLError(err));
		return -1;
	}

	// Set OpenCL Kernel Arguments - Order Indicated by Final Argument
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &srcA, 0))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &inputB, 1))
		return -1;
	if (CL_SUCCESS != SetKernelArgument(&ocl.kernel, &dstMem, 2))
		return -1;

	// Enqueue Kernel (wrapped in profiler timing)
	ProfilerStruct profiler;
	profiler.Start();
	size_t globalWorkSize[2] = { arrayWidth, arrayHeight };
	size_t localWorkSize[2] = { 8, 4 };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 2, localWorkSize))
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
		for (size_t i = 0; i < arrayWidth; ++i)
		{
			for (size_t j = 0; j < arrayHeight; ++j)
			{
				cl_float expectedValue = 1.0;
				size_t idx = j*arrayWidth + i;
				for (cl_uint i = 0; i < inputB; i++)
				{
					expectedValue *= inputA[idx];
				}
				if (abs(resultPtr[idx] - expectedValue) > dmath::MIN_DIFF)
				{
					LogError("Verification failed at %d: Expected: %f. Actual: %f.\n", idx, expectedValue, resultPtr[idx]);
					failed = true;
				}
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

int exCL_MatrixPower(ResultsStruct* results)
{
	return exCL_MatrixPower_Helper(results, "elementwiseMatrixPower");
}

int exCL_MatrixPower_Manual(ResultsStruct* results)
{
	return exCL_MatrixPower_Helper(results, "elementwiseMatrixPower_Manual");
}

int exSequential_MatrixPower(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	const cl_uint arrayHeight = GLOBAL_ARRAY_HEIGHT;

	// allocate memory
	cl_float* vectorA = (cl_float*)malloc((sizeof(cl_float) * arrayWidth * arrayHeight));
	cl_uint K = 2;
	cl_float* outputC = (cl_float*)malloc((sizeof(cl_float) * arrayWidth * arrayHeight));

	// generate data
	tools::generateInputCL(vectorA, arrayWidth, arrayHeight);

	// add
	ProfilerStruct profiler;
	profiler.Start();
	bool failed = false;
	for (size_t i = 0; i < arrayWidth; i++)
	{
		for (size_t j = 0; j < arrayHeight; j++)
		{
			size_t idx = j*arrayWidth + i;
			outputC[idx] = (float)pow(vectorA[idx], K);
		}
	}
	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(outputC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}

////////////////// PROGRESSIVE ARRAY SUM /////////////////
int exCL_ProgressiveArraySum(ResultsStruct* results)
{
	cl_int err;
	ocl_args_d_t ocl(CL_DEVICE_TYPE_GPU);

	// Create Local Variables and Allocate Memory
	// The buffer should be aligned with 4K page and size should fit 64-byte cached line
	cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;
	cl_uint arrayHeight = GLOBAL_ARRAY_HEIGHT;
	cl_uint optimizedSizeFloat = ((sizeof(cl_float) * arrayWidth * arrayHeight - 1) / 64 + 1) * 64;
	cl_float* inputA = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	cl_float* outputC = (cl_float*)_aligned_malloc(optimizedSizeFloat, 4096);
	if (NULL == inputA || NULL == outputC)
	{
		LogError("Error: _aligned_malloc failed to allocate buffers.\n");
		return -1;
	}
	// Generate Random Input
	tools::generateInputCLSeq(inputA, arrayWidth, 1);

	// Create OpenCL buffers from host memory for use by Kernel
	cl_mem           srcA;              // hold first source buffer
	cl_mem           dstMem;            // hold destination buffer
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &srcA, inputA, arrayWidth, 1))
		return -1;
	if (CL_SUCCESS != CreateReadBufferArg(&ocl.context, &dstMem, outputC, arrayWidth, 1))
		return -1;

	// Create and build the OpenCL program - imports named cl file.
	if (CL_SUCCESS != ocl.CreateAndBuildProgram(FILENAME))
		return -1;

	// Create Kernel - kernel name must match kernel name in cl file
	ocl.kernel = clCreateKernel(ocl.program, "progressiveArraySum", &err);
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
	size_t localWorkSize[1] = { 256 };
	if (CL_SUCCESS != ocl.ExecuteKernel(globalWorkSize, 1, localWorkSize))
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

int exSequential_ProgressiveArraySum(ResultsStruct* results)
{
	const cl_uint arrayWidth = GLOBAL_ARRAY_WIDTH;

	// allocate memory
	cl_float* vectorA = (cl_float*)malloc((sizeof(cl_float) * arrayWidth));
	cl_float* outputC = (cl_float*)malloc((sizeof(cl_float) * arrayWidth));

	// generate data
	tools::generateInputCL(vectorA, arrayWidth, 1);

	// add
	ProfilerStruct profiler;
	profiler.Start();

	float cumSum = 0.0;
	for (size_t i = 0; i < arrayWidth; ++i)
	{
		cumSum += vectorA[i];
		outputC[i] = cumSum;
	}

	profiler.Stop();
	float runTime = profiler.Log();

	// free memory
	free(vectorA);
	free(outputC);

	results->WindowsRunTime = (double)runTime;
	results->HasWindowsRunTime = true;
	return 0;
}